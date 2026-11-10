import { invoke } from './ipc'
import type {
  AppPackage,
  AppSettings,
  AutomationSequence,
  ConnectionHistoryEntry,
  DependencyStatus,
  DeviceInfo,
  DeviceList,
  MirrorSettings,
  PerformanceSnapshot,
  RecordingInfo,
  SessionInfo,
  UpdateInfo,
  WirelessPairInput,
  TcpipConnectInput,
  TcpipEnableInput,
  AppFileEntry,
} from './types'

// Typed facade over the Rust `#[tauri::command]` handlers. Command names are kebab-case
// and map 1:1 to `src-tauri/src/commands/*`.

export const api = {
  ping: () => invoke<{ version: string }>('ping'),
  window_action: (action: 'minimize' | 'toggle_maximize' | 'close') =>
    invoke<void>('window_action', { action }),
  get_dependency_status: () => invoke<DependencyStatus>('get_dependency_status'),
  list_devices: () => invoke<DeviceList>('list_devices'),
  refresh_device: (serial: string) => invoke<DeviceInfo>('refresh_device', { serial }),
  start_adb: () => invoke<void>('start_adb'),
  stop_adb: () => invoke<void>('stop_adb'),
  adb_version: () => invoke<string>('adb_version'),

  wireless_pair: (input: WirelessPairInput) => invoke<{ serial: string }>('wireless_pair', { input }),
  tcpip_connect: (input: TcpipConnectInput) => invoke<void>('tcpip_connect', { input }),
  tcpip_enable: (input: TcpipEnableInput) => invoke<void>('tcpip_enable', { input }),
  disconnect_device: (serial: string) => invoke<void>('disconnect_device', { serial }),
  forget_device: (serial: string) => invoke<void>('forget_device', { serial }),
  rename_device: (serial: string, alias: string) => invoke<void>('rename_device', { serial, alias }),

  start_mirror: (settings: MirrorSettings) => invoke<SessionInfo>('start_mirror', { settings }),
  stop_mirror: (sessionId: string) => invoke<void>('stop_mirror', { sessionId }),
  list_sessions: () => invoke<SessionInfo[]>('list_sessions'),

  take_screenshot: (serial: string, destPath?: string) => invoke<string>('take_screenshot', { serial, destPath }),

  list_files: (serial: string, path: string) => invoke<AppFileEntry[]>('list_files', { serial, path }),
  push_file: (serial: string, local: string, remote: string) => invoke<void>('push_file', { serial, local, remote }),
  pull_file: (serial: string, remote: string, local: string) => invoke<void>('pull_file', { serial, remote, local }),
  mkdir: (serial: string, path: string) => invoke<void>('mkdir', { serial, path }),
  delete_file: (serial: string, path: string) => invoke<void>('delete_file', { serial, path }),
  rename_file: (serial: string, from: string, to: string) => invoke<void>('rename_file', { serial, from, to }),

  list_packages: (serial: string) => invoke<AppPackage[]>('list_packages', { serial }),
  install_apk: (serial: string, apkPath: string) => invoke<void>('install_apk', { serial, apkPath }),
  uninstall_package: (serial: string, packageName: string) => invoke<void>('uninstall_package', { serial, packageName }),
  launch_package: (serial: string, packageName: string) => invoke<void>('launch_package', { serial, packageName }),
  force_stop_package: (serial: string, packageName: string) => invoke<void>('force_stop_package', { serial, packageName }),

  get_performance: (serial: string) => invoke<PerformanceSnapshot>('get_performance', { serial }),
  app_resource_usage: () => invoke<{ cpuPercent: number; memoryMB: number }>('app_resource_usage'),

  get_history: () => invoke<ConnectionHistoryEntry[]>('get_history'),
  clear_history: () => invoke<void>('clear_history'),

  get_recordings: () => invoke<RecordingInfo[]>('get_recordings'),

  get_settings: () => invoke<AppSettings>('get_settings'),
  set_settings: (settings: AppSettings) => invoke<void>('set_settings', { settings }),

  get_sequences: () => invoke<AutomationSequence[]>('get_sequences'),
  save_sequence: (sequence: AutomationSequence) => invoke<void>('save_sequence', { sequence }),
  delete_sequence: (id: string) => invoke<void>('delete_sequence', { id }),
  run_sequence: (sequence: AutomationSequence) => invoke<void>('run_sequence', { sequence }),

  check_for_updates: () => invoke<UpdateInfo | null>('check_for_updates'),
  open_path: (path: string) => invoke<void>('open_path', { path }),

  pick_file: (filters?: string[]) => invoke<string | null>('pick_file', { filters }),
  pick_folder: () => invoke<string | null>('pick_folder'),
  save_file: (defaultName?: string) => invoke<string | null>('save_file', { defaultName }),
}
