use crate::db;
use crate::models::{AppSettings, SessionInfo};
use rusqlite::Connection;
use std::collections::HashMap;
use std::sync::Mutex;
use tokio::process::Child;

pub struct ManagedSession {
    pub child: Child,
    pub info: SessionInfo,
}

pub struct ProcessManager {
    pub sessions: HashMap<String, ManagedSession>,
    pub adb_started: bool,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            adb_started: false,
        }
    }
}

pub struct AppState {
    pub processes: Mutex<ProcessManager>,
    pub db: Mutex<Connection>,
    pub settings: Mutex<AppSettings>,
    pub sysinfo: Mutex<sysinfo::System>,
}

impl AppState {
    pub fn new() -> Self {
        let data_dir = directories::ProjectDirs::from("com", "mirrordeck", "MirrorDeck")
            .map(|d| d.data_dir().to_path_buf())
            .unwrap_or_else(|| std::env::temp_dir().join("mirrordeck"));
        let _ = std::fs::create_dir_all(&data_dir);
        let db_path = data_dir.join("mirrordeck.db");

        let conn = db::init(&db_path).unwrap_or_else(|_| {
            Connection::open_in_memory().expect("failed to open in-memory database")
        });
        let settings = db::load_settings(&conn).unwrap_or_default();

        Self {
            processes: Mutex::new(ProcessManager::new()),
            db: Mutex::new(conn),
            settings: Mutex::new(settings),
            sysinfo: Mutex::new(sysinfo::System::new()),
        }
    }
}
