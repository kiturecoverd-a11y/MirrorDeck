use crate::adb;
use crate::error::{AppError, AppResult};
use crate::models::{Dependency, DependencyStatus, ResourceUsage, UpdateInfo};
use crate::scrcpy;
use crate::state::AppState;

#[tauri::command]
pub fn ping() -> AppResult<serde_json::Value> {
    Ok(serde_json::json!({ "version": env!("CARGO_PKG_VERSION") }))
}

#[tauri::command]
pub fn window_action(window: tauri::Window, action: String) -> AppResult<()> {
    match action.as_str() {
        "minimize" => {
            let _ = window.minimize();
        }
        "toggle_maximize" => {
            let _ = if window.is_maximized().unwrap_or(false) {
                window.unmaximize()
            } else {
                window.maximize()
            };
        }
        "close" => {
            let _ = window.close();
        }
        other => return Err(AppError::new("window", format!("Unknown action: {other}"))),
    }
    Ok(())
}

#[tauri::command]
pub async fn get_dependency_status(state: tauri::State<'_, AppState>) -> AppResult<DependencyStatus> {
    let adb_path = adb::resolve_adb(&state).ok();
    let adb_version = if adb_path.is_some() {
        adb::adb_version(&state).await.ok()
    } else {
        None
    };
    let scrcpy_path = scrcpy::resolve_scrcpy(&state).ok();
    let scrcpy_version = if scrcpy_path.is_some() {
        scrcpy::scrcpy_version(&state).await.ok()
    } else {
        None
    };
    Ok(DependencyStatus {
        adb: Dependency {
            found: adb_path.is_some(),
            path: adb_path.map(|p| p.display().to_string()),
            version: adb_version,
        },
        scrcpy: Dependency {
            found: scrcpy_path.is_some(),
            path: scrcpy_path.map(|p| p.display().to_string()),
            version: scrcpy_version,
        },
    })
}

#[tauri::command]
pub async fn start_adb(state: tauri::State<'_, AppState>) -> AppResult<()> {
    adb::start_server(&state).await
}

#[tauri::command]
pub async fn stop_adb(state: tauri::State<'_, AppState>) -> AppResult<()> {
    let _ = adb::run_adb(&state, &["kill-server".to_string()]).await;
    state.processes.lock().unwrap().adb_started = false;
    Ok(())
}

#[tauri::command]
pub async fn adb_version(state: tauri::State<'_, AppState>) -> AppResult<String> {
    adb::adb_version(&state).await
}

#[tauri::command]
pub fn app_resource_usage(state: tauri::State<'_, AppState>) -> ResourceUsage {
    let mut sys = state.sysinfo.lock().unwrap();
    sys.refresh_processes();
    sys.refresh_cpu_usage();
    let pid = sysinfo::Pid::from_u32(std::process::id());
    let memory_mb = sys
        .process(pid)
        .map(|p| p.memory() as f64 / 1024.0 / 1024.0)
        .unwrap_or(0.0);
    let cpu_percent = sys.process(pid).map(|p| p.cpu_usage() as f64).unwrap_or(0.0);
    ResourceUsage {
        cpu_percent,
        memory_mb,
    }
}

#[tauri::command]
pub fn check_for_updates() -> AppResult<Option<UpdateInfo>> {
    // No update server is configured; MirrorDeck stays fully offline. Returns null.
    Ok(None)
}

#[tauri::command]
pub fn open_path(path: String) -> AppResult<()> {
    open_in_explorer(&path);
    Ok(())
}

fn open_in_explorer(path: &str) {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer")
            .arg(format!("/select,{path}"))
            .spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg("-R").arg(path).spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open").arg(path).spawn();
    }
}

#[tauri::command]
pub async fn pick_file(filters: Option<Vec<String>>) -> Option<String> {
    let mut dialog = rfd::AsyncFileDialog::new();
    if let Some(f) = filters {
        dialog = dialog.add_filter("Supported", &f);
    }
    dialog.pick_file().await.map(|h| h.path().display().to_string())
}

#[tauri::command]
pub async fn pick_folder() -> Option<String> {
    rfd::AsyncFileDialog::new()
        .pick_folder()
        .await
        .map(|h| h.path().display().to_string())
}

#[tauri::command]
pub async fn save_file(default_name: Option<String>) -> Option<String> {
    let mut dialog = rfd::AsyncFileDialog::new();
    if let Some(n) = default_name {
        dialog = dialog.set_file_name(&n);
    }
    dialog.save_file().await.map(|h| h.path().display().to_string())
}
