// Shared domain types for MirrorDeck.
// This is the single source of truth mirrored (with serde) on the Rust side.

export type ConnectionType = 'usb' | 'tcpip' | 'wireless'

export type DeviceState =
  | 'device'
  | 'unauthorized'
  | 'offline'
  | 'connecting'
  | 'recovery'

export interface DeviceInfo {
  /** adb serial (or ip:port for TCP/IP) */
  serial: string
  state: DeviceState
  connection: ConnectionType
  model?: string
  deviceName?: string
  manufacturer?: string
  androidVersion?: string
  sdkVersion?: string
  resolution?: string
  batteryLevel?: number
  batteryCharging?: boolean
  /** user-assigned local alias */
  localAlias?: string
  savedAt?: number
}

export interface DeviceList {
  devices: DeviceInfo[]
  adbAvailable: boolean
  adbVersion?: string
}

export interface DependencyStatus {
  adb: { found: boolean; path?: string; version?: string }
  scrcpy: { found: boolean; path?: string; version?: string }
}

export interface WirelessPairInput {
  host: string
  port: number
  code: string
}

export interface TcpipConnectInput {
  host: string
  port: number
}

export interface TcpipEnableInput {
  serial: string
  port: number
}

export type VideoCodec = 'h264' | 'h265' | 'av1'

export interface MirrorSettings {
  serial: string
  maxSize: number
  maxFps: number
  videoBitRateMbps: number
  videoCodec: VideoCodec
  noAudio: boolean
  stayAwake: boolean
  turnScreenOff: boolean
  fullscreen: boolean
  windowTitle?: string
  record: boolean
  recordPath?: string
}

export type SessionStatus = 'starting' | 'running' | 'stopping' | 'stopped' | 'error'

export interface SessionInfo {
  id: string
  serial: string
  pid: number
  status: SessionStatus
  startedAt: number
  settings: MirrorSettings
  lastError?: string
}

export interface AppFileEntry {
  name: string
  path: string
  isDirectory: boolean
  sizeBytes: number
  modifiedAt?: number
}

export interface AppPackage {
  packageName: string
  versionName?: string
  versionCode?: string
  label?: string
  isSystem: boolean
  installedAt?: number
}

export type RecordingStatus = 'recording' | 'completed' | 'failed'

export interface RecordingInfo {
  id: string
  filePath: string
  serial: string
  startedAt: number
  endedAt?: number
  sizeBytes?: number
  durationSec?: number
  status: RecordingStatus
}

export interface ConnectionHistoryEntry {
  id: number
  serial: string
  kind: ConnectionType
  connectedAt: number
  disconnectedAt?: number
  succeeded: boolean
  detail?: string
}

export interface PerformanceSnapshot {
  model?: string
  androidVersion?: string
  resolution?: string
  batteryLevel?: number
  batteryCharging?: boolean
  temperatureC?: number
  connection: ConnectionType
}

export interface AppError {
  kind: string
  message: string
  detail?: string
  retryable: boolean
}

export type InvokeResult<T> = { ok: true; data: T } | { ok: false; error: AppError }

export type ThemePreference = 'system' | 'light' | 'dark'

export interface AppSettings {
  theme: ThemePreference
  accentHue: number
  language: string
  notificationsEnabled: boolean
  launchAtStartup: boolean
  adbPath?: string
  scrcpyPath?: string
  defaultConnectionMode: 'usb' | 'wireless'
  autoReconnectWireless: boolean
  connectionTimeoutMs: number
  mirror: {
    maxSize: number
    maxFps: number
    videoBitRateMbps: number
    videoCodec: VideoCodec
    audioForwarding: boolean
    fullscreen: boolean
  }
  recording: {
    directory?: string
    format: 'mp4' | 'mkv'
    quality: 'low' | 'balanced' | 'high'
  }
  advanced: {
    debugMode: boolean
    keepProcessesAlive: boolean
  }
}

export interface UpdateInfo {
  version: string
  url: string
  notes?: string
}

export type AutomationActionType =
  | 'launch_app'
  | 'shell_command'
  | 'open_settings'
  | 'screenshot'
  | 'start_mirror'
  | 'stop_mirror'
  | 'wait'

export interface AutomationStep {
  id: string
  type: AutomationActionType
  params: Record<string, string>
}

export interface AutomationSequence {
  id: string
  name: string
  serial: string
  steps: AutomationStep[]
}

export interface NotificationInput {
  kind: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
}
