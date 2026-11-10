use crate::db;
use crate::error::AppResult;
use crate::models::{MirrorSettings, RecordingInfo, SessionInfo};
use crate::scrcpy;
use crate::state::AppState;

#[tauri::command]
pub async fn start_mirror(
    state: tauri::State<'_, AppState>,
    settings: MirrorSettings,
) -> AppResult<SessionInfo> {
    let recording = settings.record
        && settings
            .record_path
            .as_deref()
            .map(|p| !p.trim().is_empty())
            .unwrap_or(false);
    let record_id = recording.then(|| format!("rec-{}", db::now_ms()));

    let session = scrcpy::start_session(&state, &settings, record_id.as_deref()).await?;

    if let (Some(id), Some(path)) = (record_id, settings.record_path.clone()) {
        let _ = db::add_recording(
            &state.db.lock().unwrap(),
            &RecordingInfo {
                id,
                file_path: path,
                serial: settings.serial.clone(),
                started_at: session.started_at,
                ended_at: None,
                size_bytes: None,
                duration_sec: None,
                status: "recording".to_string(),
            },
        );
    }
    Ok(session)
}

#[tauri::command]
pub async fn stop_mirror(state: tauri::State<'_, AppState>, session_id: String) -> AppResult<()> {
    scrcpy::stop_session(&state, &session_id).await
}

#[tauri::command]
pub async fn list_sessions(state: tauri::State<'_, AppState>) -> AppResult<Vec<SessionInfo>> {
    Ok(scrcpy::list_sessions(&state).await)
}
