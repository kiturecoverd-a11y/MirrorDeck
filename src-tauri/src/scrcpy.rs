use crate::adb::spawn_stderr_drain;
use crate::db;
use crate::error::{scrcpy_missing, AppError, AppResult};
use crate::models::{MirrorSettings, RecordingInfo, SessionInfo};
use crate::state::{AppState, ManagedSession};
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicU64, Ordering};

static SESSION_COUNTER: AtomicU64 = AtomicU64::new(1);

pub fn resolve_scrcpy(state: &AppState) -> AppResult<PathBuf> {
    let configured = state.settings.lock().unwrap().scrcpy_path.clone();
    if let Some(p) = configured {
        let pb = PathBuf::from(&p);
        if pb.is_file() {
            return Ok(pb);
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let bundled = dir.join("bin").join("scrcpy.exe");
            if bundled.is_file() {
                return Ok(bundled);
            }
        }
    }
    if let Some(path) = std::env::var_os("PATH") {
        for dir in std::env::split_paths(&path) {
            let p = dir.join("scrcpy.exe");
            if p.is_file() {
                return Ok(p);
            }
        }
    }
    Err(scrcpy_missing())
}

pub async fn scrcpy_version(state: &AppState) -> AppResult<String> {
    let path = resolve_scrcpy(state)?;
    let mut command = tokio::process::Command::new(&path);
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);
    let out = command
        .arg("--version")
        .output()
        .await
        .map_err(|e| AppError::new("scrcpy", format!("Failed to run Mirror Engine: {e}")))?;
    let stdout = String::from_utf8_lossy(&out.stdout);
    // The engine prints e.g. `scrcpy 5.0.1 <https://github.com/Genymobile/scrcpy>`;
    // surface only the version number so the UI shows `Mirror Engine 5.0.1`.
    let first_line = stdout.lines().next().unwrap_or("").trim();
    let version = first_line
        .split_whitespace()
        .find(|tok| tok.chars().next().is_some_and(|c| c.is_ascii_digit()))
        .unwrap_or("")
        .to_string();
    Ok(version)
}

pub fn build_args(s: &MirrorSettings) -> Vec<String> {
    let mut args = vec!["--serial".to_string(), s.serial.clone()];
    if s.max_size > 0 {
        args.push("--max-size".to_string());
        args.push(s.max_size.to_string());
    }
    if s.max_fps > 0 {
        args.push("--max-fps".to_string());
        args.push(s.max_fps.to_string());
    }
    args.push("--video-bit-rate".to_string());
    args.push(format!("{}M", s.video_bit_rate_mbps));
    if !s.video_codec.is_empty() {
        args.push("--video-codec".to_string());
        args.push(s.video_codec.clone());
    }
    if s.no_audio {
        args.push("--no-audio".to_string());
    }
    if s.stay_awake {
        args.push("--stay-awake".to_string());
    }
    if s.turn_screen_off {
        args.push("--turn-screen-off".to_string());
    }
    if s.fullscreen {
        args.push("--fullscreen".to_string());
    }
    if let Some(title) = &s.window_title {
        if !title.trim().is_empty() {
            args.push("--window-title".to_string());
            args.push(title.clone());
        }
    }
    if s.record {
        if let Some(path) = &s.record_path {
            if !path.trim().is_empty() {
                args.push("--record".to_string());
                args.push(path.clone());
            }
        }
    }
    args
}

pub async fn start_session(
    state: &AppState,
    settings: &MirrorSettings,
    record_id: Option<&str>,
) -> AppResult<SessionInfo> {
    let path = resolve_scrcpy(state)?;
    let args = build_args(settings);

    let mut command = tokio::process::Command::new(&path);
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);
    let mut child = command
        .args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| AppError::new("scrcpy", format!("Failed to launch Mirror Engine: {e}")))?;

    if let Some(stderr) = child.stderr.take() {
        spawn_stderr_drain(stderr);
    }

    tokio::time::sleep(std::time::Duration::from_millis(900)).await;
    if let Some(status) = child
        .try_wait()
        .map_err(|e| AppError::new("scrcpy", e.to_string()))?
    {
        let code = status.code().unwrap_or(-1);
        return Err(AppError::new(
            "scrcpy",
            format!("Nova exited immediately (code {code}). Check the device serial and that USB debugging is authorized."),
        ));
    }

    let id = match record_id {
        Some(id) => id.to_string(),
        None => format!(
            "s-{}-{}",
            SESSION_COUNTER.fetch_add(1, Ordering::Relaxed),
            db::now_ms()
        ),
    };
    let pid = child.id().unwrap_or(0);
    let info = SessionInfo {
        id: id.clone(),
        serial: settings.serial.clone(),
        pid,
        status: "running".to_string(),
        started_at: db::now_ms(),
        settings: settings.clone(),
        last_error: None,
    };

    state.processes.lock().unwrap().sessions.insert(
        id,
        ManagedSession {
            child,
            info: info.clone(),
        },
    );

    Ok(info)
}

pub async fn stop_session(state: &AppState, session_id: &str) -> AppResult<()> {
    let managed = state.processes.lock().unwrap().sessions.remove(session_id);
    if let Some(mut m) = managed {
        let _ = m.child.kill().await;
        if m.info.settings.record {
            finalize_recording(state, &m.info, "failed");
        }
    }
    Ok(())
}

pub async fn list_sessions(state: &AppState) -> Vec<SessionInfo> {
    reap_sessions(state).await;
    state
        .processes
        .lock()
        .unwrap()
        .sessions
        .values()
        .map(|s| s.info.clone())
        .collect()
}

/// Remove exited children and finalize any recordings they owned.
async fn reap_sessions(state: &AppState) {
    let mut finalized: Vec<SessionInfo> = Vec::new();
    {
        let mut pm = state.processes.lock().unwrap();
        let mut finished = Vec::new();
        for (id, s) in pm.sessions.iter_mut() {
            match s.child.try_wait() {
                Ok(Some(status)) => {
                    let code = status.code().unwrap_or(-1);
                    s.info.status = if code == 0 { "stopped" } else { "error" }.to_string();
                    if code != 0 {
                        s.info.last_error = Some(format!("exited with code {code}"));
                    }
                    finished.push(id.clone());
                }
                _ => {}
            }
        }
        for id in finished {
            if let Some(s) = pm.sessions.remove(&id) {
                finalized.push(s.info);
            }
        }
    }
    for info in finalized {
        let status = if info.status == "stopped" {
            "completed"
        } else {
            "failed"
        };
        finalize_recording(state, &info, status);
    }
}

fn finalize_recording(state: &AppState, info: &SessionInfo, status: &str) {
    if !info.settings.record {
        return;
    }
    let Some(path) = info.settings.record_path.as_deref() else {
        return;
    };
    let now = db::now_ms();
    let size = std::fs::metadata(path).ok().map(|m| m.len() as i64);
    let duration = Some(((now - info.started_at).max(0) / 1000) as u64);
    let rec = RecordingInfo {
        id: info.id.clone(),
        file_path: path.to_string(),
        serial: info.serial.clone(),
        started_at: info.started_at,
        ended_at: Some(now),
        size_bytes: size,
        duration_sec: duration,
        status: status.to_string(),
    };
    let _ = db::add_recording(&state.db.lock().unwrap(), &rec);
}
