use crate::error::{adb_missing, AppError, AppResult};
use crate::state::AppState;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};

pub struct RawDevice {
    pub serial: String,
    pub state: String,
    pub model: Option<String>,
    pub device_name: Option<String>,
    pub connection: String,
}

pub struct DeviceProps {
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub android_version: Option<String>,
    pub sdk_version: Option<String>,
    pub resolution: Option<String>,
    pub battery_level: Option<i32>,
    pub battery_charging: Option<bool>,
    pub temperature_c: Option<f32>,
}

fn find_in_path(cmd: &str) -> Option<PathBuf> {
    let path = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path) {
        for name in [format!("{cmd}.exe"), cmd.to_string()] {
            let p = dir.join(&name);
            if p.is_file() {
                return Some(p);
            }
        }
    }
    None
}

pub fn resolve_adb(state: &AppState) -> AppResult<PathBuf> {
    let configured = state.settings.lock().unwrap().adb_path.clone();
    if let Some(p) = configured {
        let pb = PathBuf::from(&p);
        if pb.is_file() {
            return Ok(pb);
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            let bundled = dir.join("bin").join("adb.exe");
            if bundled.is_file() {
                return Ok(bundled);
            }
        }
    }
    if let Some(p) = find_in_path("adb") {
        return Ok(p);
    }
    Err(adb_missing())
}

pub async fn adb_version(state: &AppState) -> AppResult<String> {
    let out = run_adb(state, &["version".to_string()]).await?;
    Ok(out.lines().next().unwrap_or("adb").trim().to_string())
}

pub async fn start_server(state: &AppState) -> AppResult<()> {
    let _ = run_adb(state, &["start-server".to_string()]).await?;
    state.processes.lock().unwrap().adb_started = true;
    Ok(())
}

pub async fn run_adb(state: &AppState, args: &[String]) -> AppResult<String> {
    let path = resolve_adb(state)?;
    let mut command = tokio::process::Command::new(&path);
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);
    let out = command
        .args(args)
        .stdin(Stdio::null())
        .output()
        .await
        .map_err(|e| AppError::new("adb", format!("Failed to launch adb: {e}")))?;

    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
    if !out.status.success() {
        let msg = if stderr.trim().is_empty() {
            stdout.trim()
        } else {
            stderr.trim()
        };
        return Err(AppError::new("adb", format!("adb failed: {msg}")).with_detail(msg));
    }
    Ok(stdout)
}

pub async fn run_adb_serial(state: &AppState, serial: &str, args: &[String]) -> AppResult<String> {
    let mut full = vec!["-s".to_string(), serial.to_string()];
    full.extend_from_slice(args);
    run_adb(state, &full).await
}

pub async fn shell(state: &AppState, serial: &str, cmd: &str) -> AppResult<String> {
    run_adb_serial(state, serial, &["shell".to_string(), cmd.to_string()]).await
}

pub async fn list_raw(state: &AppState) -> AppResult<Vec<RawDevice>> {
    let out = run_adb(state, &["devices".to_string(), "-l".to_string()]).await?;
    let mut result = Vec::new();
    for line in out.lines().skip(1) {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let mut parts = line.split_whitespace();
        let serial = parts.next().unwrap_or_default().to_string();
        let state = parts.next().unwrap_or_default().to_string();
        if serial.is_empty() {
            continue;
        }
        let mut model = None;
        let mut device_name = None;
        let mut has_usb = false;
        for kv in parts {
            if let Some(v) = kv.strip_prefix("model:") {
                model = Some(v.to_string());
            } else if let Some(v) = kv.strip_prefix("device:") {
                device_name = Some(v.to_string());
            } else if kv.starts_with("usb:") {
                has_usb = true;
            }
        }
        let connection = if has_usb || !serial.contains(':') {
            "usb".to_string()
        } else {
            "tcpip".to_string()
        };
        result.push(RawDevice {
            serial,
            state,
            model,
            device_name,
            connection,
        });
    }
    Ok(result)
}

pub async fn get_props(state: &AppState, serial: &str) -> DeviceProps {
    let mut props = DeviceProps {
        model: None,
        manufacturer: None,
        android_version: None,
        sdk_version: None,
        resolution: None,
        battery_level: None,
        battery_charging: None,
        temperature_c: None,
    };

    if let Ok(out) = shell(
        state,
        serial,
        "getprop ro.product.model && getprop ro.product.manufacturer && getprop ro.build.version.release && getprop ro.build.version.sdk",
    )
    .await
    {
        let lines: Vec<&str> = out.lines().map(|l| l.trim()).collect();
        if lines.len() > 0 {
            props.model = Some(lines[0].to_string());
        }
        if lines.len() > 1 {
            props.manufacturer = Some(lines[1].to_string());
        }
        if lines.len() > 2 {
            props.android_version = Some(lines[2].to_string());
        }
        if lines.len() > 3 {
            props.sdk_version = Some(lines[3].to_string());
        }
    }

    if let Ok(out) = shell(state, serial, "wm size").await {
        for line in out.lines() {
            if let Some(rest) = line.strip_prefix("Physical size:") {
                props.resolution = Some(rest.trim().to_string());
                break;
            }
        }
    }

    if let Ok(out) = shell(state, serial, "dumpsys battery").await {
        for line in out.lines() {
            let t = line.trim();
            if let Some(v) = t.strip_prefix("level:") {
                props.battery_level = v.trim().parse::<i32>().ok();
            } else if let Some(v) = t.strip_prefix("status:") {
                let s: i32 = v.trim().parse().unwrap_or(0);
                props.battery_charging = Some(s == 2 || s == 5);
            } else if let Some(v) = t.strip_prefix("temperature:") {
                if let Ok(units) = v.trim().parse::<f32>() {
                    props.temperature_c = Some(units / 10.0);
                }
            }
        }
    }

    props
}

pub async fn screencap(state: &AppState, serial: &str, dest: &str) -> AppResult<()> {
    let path = resolve_adb(state)?;
    let mut command = tokio::process::Command::new(&path);
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000);
    let out = command
        .args(["-s", serial, "exec-out", "screencap", "-p"])
        .output()
        .await
        .map_err(|e| AppError::new("adb", format!("screencap failed: {e}")))?;
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr);
        return Err(AppError::new("adb", format!("screencap failed: {}", err.trim())));
    }
    std::fs::write(dest, &out.stdout)
        .map_err(|e| AppError::new("fs", format!("Failed to write screenshot: {e}")))?;
    Ok(())
}

/// Drain a child's stderr to the log so the pipe never fills and blocks the engine.
pub fn spawn_stderr_drain(mut stderr: tokio::process::ChildStderr) {
    tokio::spawn(async move {
        let mut reader = BufReader::new(&mut stderr);
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line).await {
                Ok(0) | Err(_) => break,
                Ok(_) => {
                    let trimmed = line.trim_end();
                    if !trimmed.is_empty() {
                        log::info!("[child] {trimmed}");
                    }
                }
            }
        }
    });
}
