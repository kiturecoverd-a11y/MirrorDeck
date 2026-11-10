import { create } from 'zustand'
import { api } from './api'
import { applyTheme } from './theme'
import type {
  AppSettings,
  DeviceInfo,
  NotificationInput,
  SessionInfo,
  ThemePreference,
} from './types'

interface Notification extends NotificationInput {
  id: string
  at: number
}

interface NotificationState {
  items: Notification[]
  push: (n: NotificationInput) => void
  dismiss: (id: string) => void
}

export const useNotifications = create<NotificationState>()((set) => ({
  items: [],
  push(n) {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())
    set((s) => ({ items: [...s.items, { ...n, id, at: Date.now() }] }))
  },
  dismiss(id) {
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
  },
}))

interface ThemeState {
  preference: ThemePreference
  resolved: 'light' | 'dark'
  setPreference: (p: ThemePreference) => void
}

export const useTheme = create<ThemeState>()((set) => ({
  preference: 'system',
  resolved: applyTheme('system'),
  setPreference(p) {
    set({ preference: p, resolved: applyTheme(p) })
  },
}))

interface DeviceState {
  devices: DeviceInfo[]
  adbAvailable: boolean
  adbVersion?: string
  loading: boolean
  error?: string
  refresh: () => Promise<void>
}

export const useDevices = create<DeviceState>()((set) => ({
  devices: [],
  adbAvailable: false,
  loading: false,
  async refresh() {
    set({ loading: true })
    try {
      const list = await api.list_devices()
      set({ devices: list.devices, adbAvailable: list.adbAvailable, adbVersion: list.adbVersion, loading: false, error: undefined })
    } catch (e) {
      set({ loading: false, error: (e as Error).message, adbAvailable: false })
    }
  },
}))

interface SessionState {
  sessions: SessionInfo[]
  refresh: () => Promise<void>
  start: (settings: Parameters<typeof api.start_mirror>[0]) => Promise<SessionInfo>
  stop: (sessionId: string) => Promise<void>
}

export const useSessions = create<SessionState>()((set) => ({
  sessions: [],
  async refresh() {
    try {
      set({ sessions: await api.list_sessions() })
    } catch {
      set({ sessions: [] })
    }
  },
  async start(settings) {
    const session = await api.start_mirror(settings)
    await useSessions.getState().refresh()
    return session
  },
  async stop(sessionId) {
    await api.stop_mirror(sessionId)
    await useSessions.getState().refresh()
  },
}))

interface SettingsState {
  settings: AppSettings | null
  loading: boolean
  load: () => Promise<void>
  save: (s: AppSettings) => Promise<void>
}

export const useSettings = create<SettingsState>()((set) => ({
  settings: null,
  loading: false,
  async load() {
    set({ loading: true })
    try {
      set({ settings: await api.get_settings(), loading: false })
    } catch {
      set({ loading: false })
    }
  },
  async save(s) {
    await api.set_settings(s)
    set({ settings: s })
  },
}))

export function notify(n: NotificationInput): void {
  useNotifications.getState().push(n)
}

interface NavState {
  active: string
  setActive: (id: string) => void
}

export const useNav = create<NavState>()((set) => ({
  active: 'home',
  setActive(id) {
    set({ active: id })
  },
}))
