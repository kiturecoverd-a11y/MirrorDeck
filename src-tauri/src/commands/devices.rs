use crate::adb;
use crate::db;
use crate::error::{AppError, AppResult};
use crate::models::{
    ConnectionHistoryEntry, DeviceInfo, DeviceList, TcpipConnectInput, TcpipEnableInput,
    WirelessPairInput,
};
use crate::state::AppState;
use std::net::{IpAddr, SocketAddr};
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::time::timeout;

fn pairing_endpoint(host: &str, port: u16) -> AppResult<SocketAddr> {
    let ip = host.trim().parse::<IpAddr>().map_err(|_| {
        AppError::new(
            "input",
            "Enter the IP address shown in the phone's pairing dialog.",
        )
    })?;
    if port == 0 {
        return Err(AppError::new("input", "Enter a valid pairing port."));
    }
    Ok(SocketAddr::new(ip, port))
}

async fn ensure_pairing_endpoint_reachable(endpoint: SocketAddr) -> AppResult<()> {
    match timeout(Duration::from_secs(3), TcpStream::connect(endpoint)).await {
        Ok(Ok(stream)) => {
            drop(stream);
            Ok(())
        }
        Ok(Err(error)) => Err(AppError::new(
            "wireless-pairing",
            format!(
                "The pairing address {endpoint} is not reachable. Open a fresh “Pair device with pairing code” dialog on your phone and use its IP address and pairing port. Keep that dialog open, connect the phone and PC to the same Wi-Fi, and check that VPN or firewall rules are not blocking adb.exe."
            ),
        )
        .with_detail(format!("TCP connection failed: {error}"))),
        Err(_) => Err(AppError::new(
            "wireless-pairing",
            format!(
                "The pairing address {endpoint} did not respond. Open a fresh “Pair device with pairing code” dialog on your phone and use its IP address and pairing port. Keep that dialog open, connect the phone and PC to the same Wi-Fi, and check that VPN or firewall rules are not blocking adb.exe."
            ),
        )
        .with_detail("TCP connection timed out after 3 seconds.")),
    }
}

#[tauri::command]
pub async fn list_devices(state: tauri::State<'_, AppState>) -> AppResult<DeviceList> {
    let version = adb::adb_version(&state).await.ok();
    let adb_available = version.is_some();

    let raw = match adb::list_raw(&state).await {
        Ok(r) => r,
        Err(_) => {
            return Ok(DeviceList {
                devices: vec![],
                adb_available,
                adb_version: version,
            });
        }
    };

    let aliases = {
        let conn = state.db.lock().unwrap();
        db::list_device_aliases(&conn)
    };

    let mut devices = Vec::new();
    for r in raw {
        let mut d = DeviceInfo {
            serial: r.serial.clone(),
            state: r.state,
            connection: r.connection.clone(),
            model: r.model,
            device_name: r.device_name,
            manufacturer: None,
            android_version: None,
            sdk_version: None,
            resolution: None,
            battery_level: None,
            battery_charging: None,
            local_alias: aliases
                .iter()
                .find(|(s, _)| *s == r.serial)
                .and_then(|(_, a)| a.clone()),
            saved_at: None,
        };
        if d.state == "device" {
            let props = adb::get_props(&state, &r.serial).await;
            d.manufacturer = props.manufacturer;
            d.android_version = props.android_version;
            d.sdk_version = props.sdk_version;
            d.resolution = props.resolution;
            d.battery_level = props.battery_level;
            d.battery_charging = props.battery_charging;
            if d.model.is_none() {
                d.model = props.model;
            }
        }
        devices.push(d);
    }

    Ok(DeviceList {
        devices,
        adb_available,
        adb_version: version,
    })
}

#[tauri::command]
pub async fn refresh_device(
    state: tauri::State<'_, AppState>,
    serial: String,
) -> AppResult<DeviceInfo> {
    let list = list_devices(state).await?;
    list.devices
        .into_iter()
        .find(|d| d.serial == serial)
        .ok_or_else(|| AppError::new("device", "Device not found"))
}

#[tauri::command]
pub async fn wireless_pair(
    state: tauri::State<'_, AppState>,
    input: WirelessPairInput,
) -> AppResult<serde_json::Value> {
    let endpoint = pairing_endpoint(&input.host, input.port)?;
    let code = input.code.trim();
    if code.len() != 6 || !code.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(AppError::new(
            "input",
            "Enter the current 6-digit pairing code shown on the phone.",
        ));
    }
    ensure_pairing_endpoint_reachable(endpoint).await?;
    let endpoint_text = endpoint.to_string();
    let out = match adb::run_adb(
        &state,
        &["pair".to_string(), endpoint_text.clone(), code.to_string()],
    )
    .await
    {
        Ok(output) => output,
        Err(error)
            if error
                .message
                .to_ascii_lowercase()
                .contains("protocol fault") =>
        {
            return Err(AppError::new(
                "wireless-pairing",
                "ADB reached the phone, but the pairing handshake failed. Open a new “Pair device with pairing code” dialog and enter its current code and pairing port. Do not use the regular Wireless debugging port.",
            )
            .with_detail(error.message));
        }
        Err(error) => return Err(error),
    };
    record_history(&state, &endpoint_text, "wireless", true, Some(&out));
    Ok(serde_json::json!({ "serial": endpoint_text }))
}

#[cfg(test)]
mod tests {
    use super::pairing_endpoint;
    use std::net::SocketAddr;

    #[test]
    fn parses_ipv4_pairing_endpoint() {
        assert_eq!(
            pairing_endpoint(" 192.168.1.20 ", 37015).unwrap(),
            "192.168.1.20:37015".parse::<SocketAddr>().unwrap()
        );
    }

    #[test]
    fn formats_ipv6_pairing_endpoint() {
        assert_eq!(
            pairing_endpoint("2001:db8::1", 37015).unwrap(),
            "[2001:db8::1]:37015".parse::<SocketAddr>().unwrap()
        );
    }

    #[test]
    fn rejects_invalid_host_and_zero_port() {
        assert!(pairing_endpoint("not-an-ip", 37015).is_err());
        assert!(pairing_endpoint("192.168.1.20", 0).is_err());
    }

    #[tokio::test]
    async fn explains_an_unreachable_pairing_endpoint() {
        let endpoint = "127.0.0.1:0".parse::<SocketAddr>().unwrap();
        let error = super::ensure_pairing_endpoint_reachable(endpoint)
            .await
            .unwrap_err();
        assert!(error.message.contains("not reachable"));
        assert!(error.message.contains("Pair device with pairing code"));
    }
}

#[tauri::command]
pub async fn tcpip_connect(
    state: tauri::State<'_, AppState>,
    input: TcpipConnectInput,
) -> AppResult<()> {
    let endpoint = format!("{}:{}", input.host.trim(), input.port);
    adb::run_adb(&state, &["connect".to_string(), endpoint.clone()]).await?;
    record_history(&state, &endpoint, "tcpip", true, None);
    Ok(())
}

#[tauri::command]
pub async fn tcpip_enable(
    state: tauri::State<'_, AppState>,
    input: TcpipEnableInput,
) -> AppResult<()> {
    adb::run_adb_serial(
        &state,
        &input.serial,
        &["tcpip".to_string(), input.port.to_string()],
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn disconnect_device(
    state: tauri::State<'_, AppState>,
    serial: String,
) -> AppResult<()> {
    if serial.contains(':') {
        let _ = adb::run_adb(&state, &["disconnect".to_string(), serial.clone()]).await;
    }
    Ok(())
}

#[tauri::command]
pub fn forget_device(state: tauri::State<'_, AppState>, serial: String) -> AppResult<()> {
    db::delete_device(&state.db.lock().unwrap(), &serial)
}

#[tauri::command]
pub fn rename_device(
    state: tauri::State<'_, AppState>,
    serial: String,
    alias: String,
) -> AppResult<()> {
    let conn = state.db.lock().unwrap();
    db::save_device(&conn, &serial, Some(alias.trim()), "usb")
}

fn record_history(state: &AppState, serial: &str, kind: &str, succeeded: bool, detail: Option<&str>) {
    let entry = ConnectionHistoryEntry {
        id: 0,
        serial: serial.to_string(),
        kind: kind.to_string(),
        connected_at: db::now_ms(),
        disconnected_at: None,
        succeeded,
        detail: detail.map(|s| s.to_string()),
    };
    let _ = db::add_history(&state.db.lock().unwrap(), &entry);
}
