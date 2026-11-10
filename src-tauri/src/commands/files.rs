use crate::adb;
use crate::db;
use crate::error::{AppError, AppResult};
use crate::models::AppFileEntry;
use crate::state::AppState;

fn screenshots_dir(state: &AppState) -> String {
    if let Ok(settings) = db::load_settings(&state.db.lock().unwrap()) {
        if let Some(dir) = settings.recording.directory {
            if !dir.trim().is_empty() {
                return dir;
            }
        }
    }
    directories::UserDirs::new()
        .and_then(|d| d.picture_dir().map(|p| p.to_path_buf()))
        .unwrap_or_else(std::env::temp_dir)
        .display()
        .to_string()
}

#[tauri::command]
pub async fn take_screenshot(
    state: tauri::State<'_, AppState>,
    serial: String,
    dest_path: Option<String>,
) -> AppResult<String> {
    let dest = match dest_path {
        Some(p) if !p.trim().is_empty() => p,
        _ => format!("{}\\mirrordeck-{}.png", screenshots_dir(&state), db::now_ms()),
    };
    adb::screencap(&state, &serial, &dest).await?;
    Ok(dest)
}

#[tauri::command]
pub async fn list_files(
    state: tauri::State<'_, AppState>,
    serial: String,
    path: String,
) -> AppResult<Vec<AppFileEntry>> {
    let out = adb::shell(&state, &serial, &format!("ls -la \"{}\"", path)).await?;
    parse_ls(&out, &path)
}

fn parse_ls(out: &str, base: &str) -> AppResult<Vec<AppFileEntry>> {
    let mut entries = Vec::new();
    for line in out.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("total ") {
            continue;
        }
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 6 {
            continue;
        }
        let perms = parts[0];
        if !(perms.starts_with('-') || perms.starts_with('d') || perms.starts_with('l')) {
            continue;
        }
        let is_dir = perms.starts_with('d');
        let name = parts[parts.len() - 1].to_string();
        if name == "." || name == ".." {
            continue;
        }
        let size: i64 = parts[4].parse().unwrap_or(0);
        let full = if base.ends_with('/') {
            format!("{base}{name}")
        } else {
            format!("{base}/{name}")
        };
        entries.push(AppFileEntry {
            name,
            path: full,
            is_directory: is_dir,
            size_bytes: size,
            modified_at: None,
        });
    }
    Ok(entries)
}

#[tauri::command]
pub async fn push_file(
    state: tauri::State<'_, AppState>,
    serial: String,
    local: String,
    remote: String,
) -> AppResult<()> {
    adb::run_adb_serial(&state, &serial, &["push".to_string(), local, remote])
        .await
        .map(|_| ())
}

#[tauri::command]
pub async fn pull_file(
    state: tauri::State<'_, AppState>,
    serial: String,
    remote: String,
    local: String,
) -> AppResult<()> {
    adb::run_adb_serial(&state, &serial, &["pull".to_string(), remote, local])
        .await
        .map(|_| ())
}

#[tauri::command]
pub async fn mkdir(state: tauri::State<'_, AppState>, serial: String, path: String) -> AppResult<()> {
    adb::shell(&state, &serial, &format!("mkdir -p \"{}\"", path))
        .await
        .map(|_| ())
}

#[tauri::command]
pub async fn delete_file(
    state: tauri::State<'_, AppState>,
    serial: String,
    path: String,
) -> AppResult<()> {
    adb::shell(&state, &serial, &format!("rm -rf \"{}\"", path))
        .await
        .map(|_| ())
}

#[tauri::command]
pub async fn rename_file(
    state: tauri::State<'_, AppState>,
    serial: String,
    from: String,
    to: String,
) -> AppResult<()> {
    adb::shell(&state, &serial, &format!("mv \"{}\" \"{}\"", from, to))
        .await
        .map(|_| ())
}

#[allow(dead_code)]
fn _unused(e: AppError) {
    // keep AppError import for error mapping clarity
    let _ = e;
}
