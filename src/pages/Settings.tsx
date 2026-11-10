import { useEffect, useState, type ReactNode } from 'react'
import { Settings as SettingsIcon, RefreshCw, MonitorPlay, Database, RotateCcw } from 'lucide-react'
import { Section } from '../components/Section'
import { Button, ConfirmDialog, Input, Segmented, Select, Slider, Toggle } from '../components/ui'
import { useSettings, useTheme, notify } from '../lib/store'
import { applyAccent, applyTheme } from '../lib/theme'
import { api } from '../lib/api'
import type { AppSettings, ThemePreference, VideoCodec } from '../lib/types'

const DEFAULTS: AppSettings = {
  theme: 'system',
  accentHue: 226,
  language: 'en',
  notificationsEnabled: true,
  launchAtStartup: false,
  adbPath: '',
  scrcpyPath: '',
  defaultConnectionMode: 'usb',
  autoReconnectWireless: false,
  connectionTimeoutMs: 10000,
  mirror: { maxSize: 1600, maxFps: 30, videoBitRateMbps: 8, videoCodec: 'h264', audioForwarding: true, fullscreen: false },
  recording: { directory: '', format: 'mp4', quality: 'balanced' },
  advanced: { debugMode: false, keepProcessesAlive: false },
}

const ACCENTS = [
  { hue: 226, label: 'Blue' },
  { hue: 262, label: 'Violet' },
  { hue: 174, label: 'Teal' },
  { hue: 340, label: 'Rose' },
  { hue: 38, label: 'Amber' },
]

export function SettingsPage() {
  const settings = useSettings((s) => s.settings)
  const save = useSettings((s) => s.save)
  const setTheme = useTheme((s) => s.setPreference)
  const [draft, setDraft] = useState<AppSettings>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    useSettings.getState().load()
  }, [])

  useEffect(() => {
    if (settings && !loaded) {
      setDraft(settings)
      setLoaded(true)
      setTheme(settings.theme)
      applyAccent(settings.accentHue)
    }
  }, [settings, loaded, setTheme])

  const patch = (p: Partial<AppSettings>) => setDraft((d) => ({ ...d, ...p }))

  const onSave = async () => {
    try {
      await save(draft)
      setTheme(draft.theme)
      applyAccent(draft.accentHue)
      notify({ kind: 'success', title: 'Settings saved' })
    } catch (e) {
      notify({ kind: 'error', title: 'Save failed', message: (e as Error).message })
    }
  }

  const reset = async () => {
    setDraft(DEFAULTS)
    await save(DEFAULTS)
    setTheme('system')
    applyAccent(226)
    notify({ kind: 'info', title: 'Settings reset to defaults' })
  }

  return (
    <Section
      title="Settings"
      subtitle="Configure MirrorDeck to your preference."
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button onClick={onSave}>
            <SettingsIcon className="h-4 w-4" /> Save
          </Button>
        </div>
      }
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <Group title="General">
          <Row label="Theme">
            <Segmented<ThemePreference>
              value={draft.theme}
              onChange={(theme) => { patch({ theme }); setTheme(theme); applyTheme(theme) }}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </Row>
          <Row label="Accent color">
            <div className="flex gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.hue}
                  type="button"
                  aria-label={a.label}
                  onClick={() => { patch({ accentHue: a.hue }); applyAccent(a.hue) }}
                  className={`h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-[rgb(var(--surface))] transition-transform hover:scale-110 ${draft.accentHue === a.hue ? 'ring-[var(--accent)]' : 'ring-transparent'}`}
                  style={{ backgroundColor: `hsl(${a.hue} 82% 52%)` }}
                />
              ))}
            </div>
          </Row>
          <Row label="Notifications">
            <Toggle checked={draft.notificationsEnabled} onChange={(v) => patch({ notificationsEnabled: v })} label="Notifications" />
          </Row>
          <Row label="Launch at startup">
            <Toggle checked={draft.launchAtStartup} onChange={(v) => patch({ launchAtStartup: v })} label="Launch at startup" />
          </Row>
        </Group>

        <Group title="Connection">
          <Field label="ADB executable path">
            <Input value={draft.adbPath ?? ''} onChange={(e) => patch({ adbPath: e.target.value })} placeholder="Auto-detect (bundled or PATH)" />
          </Field>
          <Field label="Nova executable path">
            <Input value={draft.scrcpyPath ?? ''} onChange={(e) => patch({ scrcpyPath: e.target.value })} placeholder="Auto-detect (bundled or PATH)" />
          </Field>
          <Row label="Default connection mode">
            <Segmented<'usb' | 'wireless'>
              value={draft.defaultConnectionMode}
              onChange={(defaultConnectionMode) => patch({ defaultConnectionMode })}
              options={[
                { value: 'usb', label: 'USB' },
                { value: 'wireless', label: 'Wireless' },
              ]}
            />
          </Row>
          <Row label="Auto-reconnect wireless">
            <Toggle checked={draft.autoReconnectWireless} onChange={(v) => patch({ autoReconnectWireless: v })} label="Auto-reconnect" />
          </Row>
          <Field label="Connection timeout (ms)">
            <Input type="number" min={1000} value={draft.connectionTimeoutMs} onChange={(e) => patch({ connectionTimeoutMs: Number(e.target.value) })} />
          </Field>
        </Group>

        <Group title="Mirroring">
          <Field label="Default max resolution">
            <Slider min={0} max={4096} step={64} value={draft.mirror.maxSize} onChange={(v) => patch({ mirror: { ...draft.mirror, maxSize: v } })} format={(v) => (v === 0 ? 'Native' : `${v}px`)} />
          </Field>
          <Field label="Default FPS">
            <Slider min={1} max={120} value={draft.mirror.maxFps} onChange={(v) => patch({ mirror: { ...draft.mirror, maxFps: v } })} format={(v) => `${v} fps`} />
          </Field>
          <Field label="Default bitrate">
            <Slider min={1} max={50} value={draft.mirror.videoBitRateMbps} onChange={(v) => patch({ mirror: { ...draft.mirror, videoBitRateMbps: v } })} format={(v) => `${v} Mbps`} />
          </Field>
          <Row label="Codec">
            <Select<VideoCodec>
              value={draft.mirror.videoCodec}
              onChange={(videoCodec) => patch({ mirror: { ...draft.mirror, videoCodec } })}
              options={[
                { value: 'h264', label: 'H.264' },
                { value: 'h265', label: 'H.265' },
                { value: 'av1', label: 'AV1' },
              ]}
            />
          </Row>
          <Row label="Audio forwarding">
            <Toggle checked={draft.mirror.audioForwarding} onChange={(v) => patch({ mirror: { ...draft.mirror, audioForwarding: v } })} label="Audio" />
          </Row>
          <Row label="Default fullscreen">
            <Toggle checked={draft.mirror.fullscreen} onChange={(v) => patch({ mirror: { ...draft.mirror, fullscreen: v } })} label="Fullscreen" />
          </Row>
        </Group>

        <Group title="Recording">
          <Field label="Recording directory">
            <Input value={draft.recording.directory ?? ''} onChange={(e) => patch({ recording: { ...draft.recording, directory: e.target.value } })} placeholder="Default save location" />
          </Field>
          <Row label="Format">
            <Segmented<'mp4' | 'mkv'>
              value={draft.recording.format}
              onChange={(format) => patch({ recording: { ...draft.recording, format } })}
              options={[
                { value: 'mp4', label: 'MP4' },
                { value: 'mkv', label: 'MKV' },
              ]}
            />
          </Row>
          <Row label="Default quality">
            <Select<'low' | 'balanced' | 'high'>
              value={draft.recording.quality}
              onChange={(quality) => patch({ recording: { ...draft.recording, quality } })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'balanced', label: 'Balanced' },
                { value: 'high', label: 'High' },
              ]}
            />
          </Row>
        </Group>

        <Group title="Advanced">
          <Row label="Debug mode">
            <Toggle checked={draft.advanced.debugMode} onChange={(v) => patch({ advanced: { ...draft.advanced, debugMode: v } })} label="Debug mode" />
          </Row>
          <Row label="Keep processes alive on exit">
            <Toggle checked={draft.advanced.keepProcessesAlive} onChange={(v) => patch({ advanced: { ...draft.advanced, keepProcessesAlive: v } })} label="Keep processes" />
          </Row>
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-[13px] text-muted">
              <Database className="h-4 w-4" />
              <span>Data is stored locally in SQLite. No account, no telemetry.</span>
            </div>
            <Button size="sm" variant="secondary" onClick={() => api.check_for_updates().then((u) => notify({ kind: 'info', title: u ? `Update ${u.version} available` : 'You are up to date' })).catch(() => notify({ kind: 'error', title: 'Update check failed' }))}>
              <RefreshCw className="h-3.5 w-3.5" /> Check updates
            </Button>
          </div>
        </Group>

        <div className="flex items-center gap-2 text-xs text-muted">
          <MonitorPlay className="h-4 w-4" />
          <span>Mirroring uses the official Mirror Engine; unsupported device capabilities are never simulated.</span>
        </div>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset settings"
        message="Restore all settings to their defaults?"
        confirmLabel="Reset"
        danger
        onConfirm={reset}
        onClose={() => setConfirmReset(false)}
      />
    </Section>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 text-[15px] font-semibold">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] font-medium">{label}</span>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </div>
  )
}
