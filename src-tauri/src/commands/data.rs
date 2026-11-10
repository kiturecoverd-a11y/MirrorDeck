use crate::adb;
use crate::db;
use crate::error::{AppError, AppResult};
use crate::models::{
    AppSettings, AutomationSequence, ConnectionHistoryEntry, PerformanceSnapshot, RecordingInfo,
};
use crate::scrcpy;
use crate::state::AppState;
use std::time::Duration;

#[tauri::command]
pub async fn get_performance(
    state: tauri::State<'_, AppState>,
    serial: String,
) -> AppResult<PerformanceSnapshot> {
    let props = adb::get_props(&state, &serial).await;
    let raw = adb::list_raw(&state).await.unwrap_or_default();
    let connection = raw
        .iter()
        .find(|d| d.serial == serial)
        .map(|d| d.connection.clone())
        .unwrap_or_else(|| "usb".to_string());

    Ok(PerformanceSnapshot {
        model: props.model,
        android_version: props.android_version,
        resolution: props.resolution,
        battery_level: props.battery_level,
        battery_charging: props.battery_charging,
        temperature_c: props.temperature_c,
        connection,
    })
}

#[tauri::command]
pub fn get_history(state: tauri::State<'_, AppState>) -> Vec<ConnectionHistoryEntry> {
    db::list_history(&state.db.lock().unwrap())
}

#[tauri::command]
pub fn clear_history(state: tauri::State<'_, AppState>) -> AppResult<()> {
    db::clear_history(&state.db.lock().unwrap())
}

#[tauri::command]
pub fn get_recordings(state: tauri::State<'_, AppState>) -> Vec<RecordingInfo> {
    db::list_recordings(&state.db.lock().unwrap())
}

#[tauri::command]
pub fn get_settings(state: tauri::State<'_, AppState>) -> AppSettings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
pub fn set_settings(state: tauri::State<'_, AppState>, settings: AppSettings) -> AppResult<()> {
    db::save_settings(&state.db.lock().unwrap(), &settings)?;
    *state.settings.lock().unwrap() = settings;
    Ok(())
}

#[tauri::command]
pub fn get_sequences(state: tauri::State<'_, AppState>) -> Vec<AutomationSequence> {
    db::list_sequences(&state.db.lock().unwrap())
}

#[tauri::command]
pub fn save_sequence(
    state: tauri::State<'_, AppState>,
    sequence: AutomationSequence,
) -> AppResult<()> {
    db::save_sequence(&state.db.lock().unwrap(), &sequence)
}

#[tauri::command]
pub fn delete_sequence(state: tauri::State<'_, AppState>, id: String) -> AppResult<()> {
    db::delete_sequence(&state.db.lock().unwrap(), &id)
}

const ALLOWED_SHELL_PREFIXES: &[&str] = &[
    "getprop",
    "wm ",
    "dumpsys",
    "pm list",
    "am start -a android.settings.",
    "input keyevent",
    "settings get",
    "settings list",
];

fn validate_shell(cmd: &str) -> AppResult<()> {
    let c = cmd.trim();
    if c.is_empty() {
        return Err(AppError::new("automation", "Empty command"));
    }
    let has_meta = c.contains(';')
        || c.contains('|')
        || c.contains('&')
        || c.contains('>')
        || c.contains('<')
        || c.contains('`')
        || c.contains('$')
        || c.contains('\n');
    if has_meta {
        return Err(AppError::new(
            "automation",
            "Command contains disallowed shell characters",
        ));
    }
    if !ALLOWED_SHELL_PREFIXES.iter().any(|p| c.starts_with(p)) {
        return Err(AppError::new(
            "automation",
            "Command is not in the allow-list (read-only/device-control only)",
        ));
    }
    Ok(())
}

#[tauri::command]
pub async fn run_sequence(
    state: tauri::State<'_, AppState>,
    sequence: AutomationSequence,
) -> AppResult<()> {
    for step in &sequence.steps {
        match step.action_type.as_str() {
            "launch_app" => {
                let pkg = step.params.get("package").cloned().unwrap_or_default();
                if pkg.is_empty() {
                    return Err(AppError::new("automation", "Launch app step missing package"));
                }
                crate::commands::apps::launch_package(state.clone(), sequence.serial.clone(), pkg)
                    .await?;
            }
            "shell_command" => {
                let cmd = step.params.get("command").cloned().unwrap_or_default();
                validate_shell(&cmd)?;
                adb::shell(&state, &sequence.serial, &cmd).await?;
            }
            "open_settings" => {
                let page = step.params.get("page").cloned().unwrap_or_default();
                if !page.starts_with("android.settings.") || !page.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_') {
                    return Err(AppError::new("automation", "Invalid settings page"));
                }
                adb::shell(&state, &sequence.serial, &format!("am start -a {page}")).await?;
            }
            "screenshot" => {
                let dest = step.params.get("path").cloned().unwrap_or_default();
                let dest = if dest.trim().is_empty() {
                    format!("mirrordeck-{}.png", db::now_ms())
                } else {
                    dest
                };
                adb::screencap(&state, &sequence.serial, &dest).await?;
            }
            "start_mirror" => {
                let settings = crate::models::MirrorSettings {
                    serial: sequence.serial.clone(),
                    max_size: 1600,
                    max_fps: 30,
                    video_bit_rate_mbps: 8,
                    video_codec: "h264".into(),
                    no_audio: false,
                    stay_awake: true,
                    turn_screen_off: false,
                    fullscreen: false,
                    window_title: None,
                    record: false,
                    record_path: None,
                };
                let _ = scrcpy::start_session(&state, &settings, None).await?;
            }
            "stop_mirror" => {
                let ids: Vec<String> = scrcpy::list_sessions(&state)
                    .await
                    .into_iter()
                    .filter(|s| s.serial == sequence.serial)
                    .map(|s| s.id)
                    .collect();
                for id in ids {
                    let _ = scrcpy::stop_session(&state, &id).await;
                }
            }
            "wait" => {
                let secs: u64 = step
                    .params
                    .get("seconds")
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(1);
                tokio::time::sleep(Duration::from_secs(secs)).await;
            }
            other => return Err(AppError::new("automation", format!("Unknown step: {other}"))),
        }
    }
    Ok(())
}
