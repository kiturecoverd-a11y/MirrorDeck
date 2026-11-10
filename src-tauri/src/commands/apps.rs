use crate::adb;
use crate::error::{AppError, AppResult};
use crate::models::AppPackage;
use crate::state::AppState;
use std::collections::HashSet;

fn check_package(p: &str) -> AppResult<()> {
    let ok = !p.is_empty() && p.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_');
    if ok {
        Ok(())
    } else {
        Err(AppError::new("apps", "Invalid package name"))
    }
}

#[tauri::command]
pub async fn list_packages(
    state: tauri::State<'_, AppState>,
    serial: String,
) -> AppResult<Vec<AppPackage>> {
    let third = adb::shell(&state, &serial, "pm list packages -3")
        .await
        .unwrap_or_default();
    let system = adb::shell(&state, &serial, "pm list packages -s")
        .await
        .unwrap_or_default();

    let mut seen: HashSet<String> = HashSet::new();
    let mut result = Vec::new();

    for (out, is_system) in [(third, false), (system, true)] {
        for line in out.lines() {
            if let Some(p) = line.trim().strip_prefix("package:") {
                let name = p.trim().to_string();
                if name.is_empty() || !seen.insert(name.clone()) {
                    continue;
                }
                result.push(AppPackage {
                    package_name: name,
                    version_name: None,
                    version_code: None,
                    label: None,
                    is_system,
                    installed_at: None,
                });
            }
        }
    }

    result.sort_by(|a, b| a.package_name.cmp(&b.package_name));
    Ok(result)
}

#[tauri::command]
pub async fn install_apk(
    state: tauri::State<'_, AppState>,
    serial: String,
    apk_path: String,
) -> AppResult<()> {
    adb::run_adb_serial(
        &state,
        &serial,
        &["install".to_string(), "-r".to_string(), apk_path],
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn uninstall_package(
    state: tauri::State<'_, AppState>,
    serial: String,
    package_name: String,
) -> AppResult<()> {
    check_package(&package_name)?;
    adb::run_adb_serial(&state, &serial, &["uninstall".to_string(), package_name])
        .await
        .map(|_| ())
}

#[tauri::command]
pub async fn launch_package(
    state: tauri::State<'_, AppState>,
    serial: String,
    package_name: String,
) -> AppResult<()> {
    check_package(&package_name)?;
    adb::shell(
        &state,
        &serial,
        &format!("monkey -p {package_name} -c android.intent.category.LAUNCHER 1"),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn force_stop_package(
    state: tauri::State<'_, AppState>,
    serial: String,
    package_name: String,
) -> AppResult<()> {
    check_package(&package_name)?;
    adb::shell(&state, &serial, &format!("am force-stop {package_name}"))
        .await
        .map(|_| ())
}
