use crate::models::{AppSettings, AutomationSequence, ConnectionHistoryEntry, RecordingInfo};
use crate::error::{AppError, AppResult};
use rusqlite::{params, Connection};
use std::path::Path;

pub fn init(path: &Path) -> AppResult<Connection> {
    let conn = Connection::open(path)
        .map_err(|e| AppError::new("db", format!("Failed to open database: {e}")))?;
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS devices (
            serial TEXT PRIMARY KEY,
            alias TEXT,
            connection TEXT,
            saved_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            serial TEXT NOT NULL,
            kind TEXT NOT NULL,
            connected_at INTEGER NOT NULL,
            disconnected_at INTEGER,
            succeeded INTEGER NOT NULL,
            detail TEXT
        );
        CREATE TABLE IF NOT EXISTS recordings (
            id TEXT PRIMARY KEY,
            file_path TEXT NOT NULL,
            serial TEXT NOT NULL,
            started_at INTEGER NOT NULL,
            ended_at INTEGER,
            size_bytes INTEGER,
            duration_sec INTEGER,
            status TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sequences (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            serial TEXT,
            steps_json TEXT NOT NULL
        );
        "#,
    )
    .map_err(|e| AppError::new("db", format!("Failed to initialize database: {e}")))?;
    Ok(conn)
}

pub fn save_device(conn: &Connection, serial: &str, alias: Option<&str>, connection: &str) -> AppResult<()> {
    conn.execute(
        "INSERT INTO devices (serial, alias, connection, saved_at) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(serial) DO UPDATE SET alias = COALESCE(?2, alias), connection = ?3, saved_at = ?4",
        params![serial, alias, connection, now_ms()],
    )
    .map_err(|e| AppError::new("db", e.to_string()))?;
    Ok(())
}

pub fn delete_device(conn: &Connection, serial: &str) -> AppResult<()> {
    conn.execute("DELETE FROM devices WHERE serial = ?1", params![serial])
        .map_err(|e| AppError::new("db", e.to_string()))?;
    Ok(())
}

pub fn get_device_alias(conn: &Connection, serial: &str) -> Option<String> {
    conn.query_row("SELECT alias FROM devices WHERE serial = ?1", params![serial], |r| r.get(0))
        .ok()
        .flatten()
}

pub fn list_device_aliases(conn: &Connection) -> Vec<(String, Option<String>)> {
    let mut stmt = match conn.prepare("SELECT serial, alias FROM devices") {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };
    let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, Option<String>>(1)?)));
    rows.into_iter().flatten().flatten().collect()
}

pub fn add_history(conn: &Connection, entry: &ConnectionHistoryEntry) -> AppResult<()> {
    conn.execute(
        "INSERT INTO history (serial, kind, connected_at, disconnected_at, succeeded, detail)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            entry.serial,
            entry.kind,
            entry.connected_at,
            entry.disconnected_at,
            entry.succeeded as i64,
            entry.detail,
        ],
    )
    .map_err(|e| AppError::new("db", e.to_string()))?;
    Ok(())
}

pub fn list_history(conn: &Connection) -> Vec<ConnectionHistoryEntry> {
    let mut stmt = match conn.prepare(
        "SELECT id, serial, kind, connected_at, disconnected_at, succeeded, detail FROM history ORDER BY id DESC LIMIT 500",
    ) {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };
    let rows = stmt.query_map([], |r| {
        Ok(ConnectionHistoryEntry {
            id: r.get(0)?,
            serial: r.get(1)?,
            kind: r.get(2)?,
            connected_at: r.get(3)?,
            disconnected_at: r.get(4)?,
            succeeded: r.get::<_, i64>(5)? != 0,
            detail: r.get(6)?,
        })
    });
    rows.into_iter().flatten().flatten().collect()
}

pub fn clear_history(conn: &Connection) -> AppResult<()> {
    conn.execute("DELETE FROM history", [])
        .map_err(|e| AppError::new("db", e.to_string()))?;
    Ok(())
}

pub fn add_recording(conn: &Connection, rec: &RecordingInfo) -> AppResult<()> {
    conn.execute(
        "INSERT OR REPLACE INTO recordings (id, file_path, serial, started_at, ended_at, size_bytes, duration_sec, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            rec.id,
            rec.file_path,
            rec.serial,
            rec.started_at,
            rec.ended_at,
            rec.size_bytes,
            rec.duration_sec,
            rec.status,
        ],
    )
    .map_err(|e| AppError::new("db", e.to_string()))?;
    Ok(())
}

pub fn list_recordings(conn: &Connection) -> Vec<RecordingInfo> {
    let mut stmt = match conn.prepare(
        "SELECT id, file_path, serial, started_at, ended_at, size_bytes, duration_sec, status FROM recordings ORDER BY started_at DESC",
    ) {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };
    let rows = stmt.query_map([], |r| {
        Ok(RecordingInfo {
            id: r.get(0)?,
            file_path: r.get(1)?,
            serial: r.get(2)?,
            started_at: r.get(3)?,
            ended_at: r.get(4)?,
            size_bytes: r.get(5)?,
            duration_sec: r.get(6)?,
            status: r.get(7)?,
        })
    });
    rows.into_iter().flatten().flatten().collect()
}

pub fn get_setting(conn: &Connection, key: &str) -> Option<String> {
    conn.query_row("SELECT value FROM settings WHERE key = ?1", params![key], |r| r.get(0))
        .ok()
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> AppResult<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = ?2",
        params![key, value],
    )
    .map_err(|e| AppError::new("db", e.to_string()))?;
    Ok(())
}

pub fn load_settings(conn: &Connection) -> AppResult<AppSettings> {
    match get_setting(conn, "app_settings") {
        Some(json) => serde_json::from_str(&json)
            .map_err(|e| AppError::new("settings", format!("Corrupt settings: {e}"))),
        None => Ok(AppSettings::default()),
    }
}

pub fn save_settings(conn: &Connection, settings: &AppSettings) -> AppResult<()> {
    let json = serde_json::to_string(settings).map_err(|e| AppError::new("settings", e.to_string()))?;
    set_setting(conn, "app_settings", &json)
}

pub fn save_sequence(conn: &Connection, seq: &AutomationSequence) -> AppResult<()> {
    let json = serde_json::to_string(&seq.steps).map_err(|e| AppError::new("automation", e.to_string()))?;
    conn.execute(
        "INSERT INTO sequences (id, name, serial, steps_json) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET name = ?2, serial = ?3, steps_json = ?4",
        params![seq.id, seq.name, seq.serial, json],
    )
    .map_err(|e| AppError::new("db", e.to_string()))?;
    Ok(())
}

pub fn list_sequences(conn: &Connection) -> Vec<AutomationSequence> {
    let mut stmt = match conn.prepare("SELECT id, name, serial, steps_json FROM sequences") {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };
    let rows = stmt.query_map([], |r| {
        let steps_json: String = r.get(3)?;
        let steps = serde_json::from_str(&steps_json).unwrap_or_default();
        Ok(AutomationSequence {
            id: r.get(0)?,
            name: r.get(1)?,
            serial: r.get(2)?,
            steps,
        })
    });
    rows.into_iter().flatten().flatten().collect()
}

pub fn delete_sequence(conn: &Connection, id: &str) -> AppResult<()> {
    conn.execute("DELETE FROM sequences WHERE id = ?1", params![id])
        .map_err(|e| AppError::new("db", e.to_string()))?;
    Ok(())
}

pub fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
