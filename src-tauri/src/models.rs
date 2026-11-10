use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub serial: String,
    pub state: String,
    pub connection: String,
    pub model: Option<String>,
    pub device_name: Option<String>,
    pub manufacturer: Option<String>,
    pub android_version: Option<String>,
    pub sdk_version: Option<String>,
    pub resolution: Option<String>,
    pub battery_level: Option<i32>,
    pub battery_charging: Option<bool>,
    pub local_alias: Option<String>,
    pub saved_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceList {
    pub devices: Vec<DeviceInfo>,
    pub adb_available: bool,
    pub adb_version: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Dependency {
    pub found: bool,
    pub path: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyStatus {
    pub adb: Dependency,
    pub scrcpy: Dependency,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MirrorSettings {
    pub serial: String,
    pub max_size: u32,
    pub max_fps: u32,
    pub video_bit_rate_mbps: u32,
    pub video_codec: String,
    pub no_audio: bool,
    pub stay_awake: bool,
    pub turn_screen_off: bool,
    pub fullscreen: bool,
    pub window_title: Option<String>,
    pub record: bool,
    pub record_path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub id: String,
    pub serial: String,
    pub pid: u32,
    pub status: String,
    pub started_at: i64,
    pub settings: MirrorSettings,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppFileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size_bytes: i64,
    pub modified_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPackage {
    pub package_name: String,
    pub version_name: Option<String>,
    pub version_code: Option<String>,
    pub label: Option<String>,
    pub is_system: bool,
    pub installed_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingInfo {
    pub id: String,
    pub file_path: String,
    pub serial: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub size_bytes: Option<i64>,
    pub duration_sec: Option<u64>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionHistoryEntry {
    pub id: i64,
    pub serial: String,
    pub kind: String,
    pub connected_at: i64,
    pub disconnected_at: Option<i64>,
    pub succeeded: bool,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceSnapshot {
    pub model: Option<String>,
    pub android_version: Option<String>,
    pub resolution: Option<String>,
    pub battery_level: Option<i32>,
    pub battery_charging: Option<bool>,
    pub temperature_c: Option<f32>,
    pub connection: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceUsage {
    pub cpu_percent: f64,
    pub memory_mb: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version: String,
    pub url: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationStep {
    pub id: String,
    #[serde(rename = "type")]
    pub action_type: String,
    pub params: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationSequence {
    pub id: String,
    pub name: String,
    pub serial: String,
    pub steps: Vec<AutomationStep>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WirelessPairInput {
    pub host: String,
    pub port: u16,
    pub code: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TcpipConnectInput {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TcpipEnableInput {
    pub serial: String,
    pub port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MirrorDefaults {
    pub max_size: u32,
    pub max_fps: u32,
    pub video_bit_rate_mbps: u32,
    pub video_codec: String,
    pub audio_forwarding: bool,
    pub fullscreen: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingDefaults {
    pub directory: Option<String>,
    pub format: String,
    pub quality: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedSettings {
    pub debug_mode: bool,
    pub keep_processes_alive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub accent_hue: u32,
    pub language: String,
    pub notifications_enabled: bool,
    pub launch_at_startup: bool,
    pub adb_path: Option<String>,
    pub scrcpy_path: Option<String>,
    pub default_connection_mode: String,
    pub auto_reconnect_wireless: bool,
    pub connection_timeout_ms: u64,
    pub mirror: MirrorDefaults,
    pub recording: RecordingDefaults,
    pub advanced: AdvancedSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".into(),
            accent_hue: 226,
            language: "en".into(),
            notifications_enabled: true,
            launch_at_startup: false,
            adb_path: None,
            scrcpy_path: None,
            default_connection_mode: "usb".into(),
            auto_reconnect_wireless: false,
            connection_timeout_ms: 10_000,
            mirror: MirrorDefaults {
                max_size: 1600,
                max_fps: 30,
                video_bit_rate_mbps: 8,
                video_codec: "h264".into(),
                audio_forwarding: true,
                fullscreen: false,
            },
            recording: RecordingDefaults {
                directory: None,
                format: "mp4".into(),
                quality: "balanced".into(),
            },
            advanced: AdvancedSettings {
                debug_mode: false,
                keep_processes_alive: false,
            },
        }
    }
}
