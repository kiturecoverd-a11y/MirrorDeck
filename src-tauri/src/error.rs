use serde::Serialize;

/// Serializable application error that maps 1:1 to the frontend `AppError` shape.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub kind: String,
    pub message: String,
    pub detail: Option<String>,
    pub retryable: bool,
}

impl AppError {
    pub fn new(kind: &str, message: impl Into<String>) -> Self {
        Self {
            kind: kind.to_string(),
            message: message.into(),
            detail: None,
            retryable: false,
        }
    }

    pub fn retryable(kind: &str, message: impl Into<String>) -> Self {
        Self {
            kind: kind.to_string(),
            message: message.into(),
            detail: None,
            retryable: true,
        }
    }

    pub fn with_detail(mut self, detail: impl Into<String>) -> Self {
        self.detail = Some(detail.into());
        self
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for AppError {}

pub type AppResult<T> = Result<T, AppError>;

pub fn adb_missing() -> AppError {
    AppError::new(
        "adb-missing",
        "ADB was not found. Set its path in Settings or install Android platform-tools.",
    )
}

pub fn scrcpy_missing() -> AppError {
    AppError::new(
        "scrcpy-missing",
        "Nova was not found. Set its path in Settings or run scripts/bootstrap.ps1.",
    )
}
