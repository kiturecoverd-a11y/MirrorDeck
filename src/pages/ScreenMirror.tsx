import { useEffect, useState, type ReactNode } from 'react'
import { MonitorPlay, Square, Clapperboard, FolderOpen } from 'lucide-react'
import { Section } from '../components/Section'
import { DevicePicker } from '../components/DevicePicker'
import { Badge, Button, ConfirmDialog, EmptyState, Segmented, Select, Slider, Toggle } from '../components/ui'
import { useDevices, useSessions, notify } from '../lib/store'
import { api } from '../lib/api'
import type { MirrorSettings, VideoCodec, SessionInfo } from '../lib/types'

interface Preset {
  id: string
  label: string
  maxSize: number
  maxFps: number
  bitrate: number
  codec: VideoCodec
}

const PRESETS: Preset[] = [
  { id: 'battery', label: 'Battery Saver', maxSize: 1024, maxFps: 15, bitrate: 2, codec: 'h264' },
  { id: 'balanced', label: 'Balanced', maxSize: 1600, maxFps: 30, bitrate: 8, codec: 'h264' },
  { id: 'high', label: 'High Quality', maxSize: 0, maxFps: 60, bitrate: 16, codec: 'h265' },
  { id: 'gaming', label: 'Gaming', maxSize: 1280, maxFps: 60, bitrate: 20, codec: 'h264' },
]

export function ScreenMirrorPage() {
  const devices = useDevices((s) => s.devices)
  const sessions = useSessions((s) => s.sessions)
  const startSession = useSessions((s) => s.start)
  const stopSession = useSessions((s) => s.stop)

  const [serial, setSerial] = useState<string | undefined>()
  const [maxSize, setMaxSize] = useState(1600)
  const [maxFps, setMaxFps] = useState(30)
  const [bitrate, setBitrate] = useState(8)
  const [codec, setCodec] = useState<VideoCodec>('h264')
  const [noAudio, setNoAudio] = useState(false)
  const [stayAwake, setStayAwake] = useState(true)
  const [turnScreenOff, setTurnScreenOff] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [record, setRecord] = useState(false)
  const [recordPath, setRecordPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [restartPromptOpen, setRestartPromptOpen] = useState(false)

  const connected = devices.filter((d) => d.state === 'device')
  const selectedSerial = connected.find((device) => device.serial === serial)?.serial ?? connected[0]?.serial
  const activeSession = sessions.find((session) => session.serial === selectedSerial && session.status === 'running')

  useEffect(() => {
    if (!activeSession) return
    const settings = activeSession.settings
    setSerial(activeSession.serial)
    setMaxSize(settings.maxSize)
    setMaxFps(settings.maxFps)
    setBitrate(settings.videoBitRateMbps)
    setCodec(settings.videoCodec)
    setNoAudio(settings.noAudio)
    setStayAwake(settings.stayAwake)
    setTurnScreenOff(settings.turnScreenOff)
    setFullscreen(settings.fullscreen)
    setRecord(settings.record)
    setRecordPath(settings.recordPath ?? '')
  }, [activeSession?.id])

  const settingsFor = (targetSerial: string): MirrorSettings => ({
    serial: targetSerial,
    maxSize,
    maxFps,
    videoBitRateMbps: bitrate,
    videoCodec: codec,
    noAudio,
    stayAwake,
    turnScreenOff,
    fullscreen,
    record,
    recordPath: record ? recordPath || undefined : undefined,
  })

  const promptToRestart = () => {
    if (activeSession) setRestartPromptOpen(true)
  }

  const applyPreset = (p: Preset) => {
    setMaxSize(p.maxSize)
    setMaxFps(p.maxFps)
    setBitrate(p.bitrate)
    setCodec(p.codec)
    promptToRestart()
  }

  const browseRecordPath = async () => {
    const p = await api.save_file('recording.mp4')
    if (p) {
      setRecordPath(p)
      promptToRestart()
    }
  }

  const start = async () => {
    if (!selectedSerial) {
      notify({ kind: 'warning', title: 'No device selected', message: 'Connect a device first.' })
      return
    }
    setBusy(true)
    try {
      await startSession(settingsFor(selectedSerial))
      notify({ kind: 'success', title: 'Mirroring started', message: selectedSerial })
    } catch (e) {
      notify({ kind: 'error', title: 'Failed to start mirroring', message: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const restart = async () => {
    if (!activeSession || !selectedSerial) return
    setBusy(true)
    try {
      await stopSession(activeSession.id)
      await startSession(settingsFor(selectedSerial))
      notify({ kind: 'success', title: 'Mirroring restarted', message: selectedSerial })
    } catch (e) {
      notify({ kind: 'error', title: 'Failed to restart mirroring', message: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const stop = async (s: SessionInfo) => {
    setBusy(true)
    try {
      await stopSession(s.id)
      notify({ kind: 'info', title: 'Mirroring stopped' })
    } catch (e) {
      notify({ kind: 'error', title: 'Failed to stop', message: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Screen Mirror" subtitle="Launch the official Nova engine with your chosen parameters.">
      {connected.length === 0 ? (
        <EmptyState
          icon={MonitorPlay}
          title="No device to mirror"
          description="Connect a device over USB or Wi-Fi, then start a mirroring session here. The mirror renders in Nova's native window."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="card p-5">
              <div className="mb-4">
                <DevicePicker value={serial} onChange={setSerial} />
              </div>

              <div className="mb-5">
                <p className="mb-2 text-xs font-medium text-muted">Performance preset</p>
                <Segmented
                  value={PRESETS.find((p) => p.maxSize === maxSize && p.maxFps === maxFps && p.bitrate === bitrate && p.codec === codec)?.id ?? 'custom'}
                  onChange={(v) => {
                    const p = PRESETS.find((x) => x.id === v)
                    if (p) applyPreset(p)
                  }}
                  options={[
                    ...PRESETS.map((p) => ({ value: p.id, label: p.label })),
                    { value: 'custom', label: 'Custom' },
                  ]}
                />
              </div>

              <div className="space-y-4">
                <Slider min={0} max={4096} step={64} value={maxSize} onChange={(v) => { setMaxSize(v); promptToRestart() }} label="Max resolution" format={(v) => (v === 0 ? 'Native' : `${v}px`)} />
                <Slider min={1} max={120} value={maxFps} onChange={(v) => { setMaxFps(v); promptToRestart() }} label="Frame rate" format={(v) => `${v} fps`} />
                <Slider min={1} max={50} value={bitrate} onChange={(v) => { setBitrate(v); promptToRestart() }} label="Video bitrate" format={(v) => `${v} Mbps`} />
                <Select<VideoCodec>
                  label="Video codec"
                  value={codec}
                  onChange={(v) => { setCodec(v); promptToRestart() }}
                  options={[
                    { value: 'h264', label: 'H.264 (lowest latency)' },
                    { value: 'h265', label: 'H.265 (better quality)' },
                    { value: 'av1', label: 'AV1' },
                  ]}
                />
              </div>

              <div className="mt-5 space-y-3 border-t border-[rgb(var(--border))] pt-4">
                <SettingRow label="Audio forwarding" hint="Requires Android 11+">
                  <Toggle checked={!noAudio} onChange={(v) => { setNoAudio(!v); promptToRestart() }} label="Audio forwarding" />
                </SettingRow>
                <SettingRow label="Keep screen awake">
                  <Toggle checked={stayAwake} onChange={(v) => { setStayAwake(v); promptToRestart() }} label="Keep awake" />
                </SettingRow>
                <SettingRow label="Turn device screen off">
                  <Toggle checked={turnScreenOff} onChange={(v) => { setTurnScreenOff(v); promptToRestart() }} label="Screen off" />
                </SettingRow>
                <SettingRow label="Start fullscreen">
                  <Toggle checked={fullscreen} onChange={(v) => { setFullscreen(v); promptToRestart() }} label="Fullscreen" />
                </SettingRow>
                <SettingRow label="Record session">
                  <Toggle checked={record} onChange={(v) => { setRecord(v); promptToRestart() }} label="Record" />
                </SettingRow>
                {record && (
                  <div className="flex gap-2">
                    <button type="button" onClick={browseRecordPath} className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-left text-xs text-muted hover:border-[var(--accent)]">
                      <FolderOpen className="h-4 w-4" />
                      {recordPath || 'Choose recording path…'}
                    </button>
                  </div>
                )}
              </div>

              <Button
                className="mt-5 w-full"
                size="lg"
                variant={activeSession ? 'danger' : 'primary'}
                onClick={() => activeSession ? stop(activeSession) : start()}
                disabled={busy}
              >
                {activeSession ? <Square className="h-4 w-4" /> : <MonitorPlay className="h-4 w-4" />}
                {activeSession ? 'Stop Mirroring' : record ? 'Start Mirroring + Recording' : 'Start Mirroring'}
              </Button>
            </div>
          </div>

          <div className="card h-fit p-5">
            <div className="mb-3 flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-muted" />
              <h3 className="text-[15px] font-semibold">Active sessions</h3>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-muted">No active sessions.</p>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s) => (
                  <li key={s.id} className="rounded-xl border border-[rgb(var(--border))] p-3">
                    <div className="flex items-center justify-between">
                      <span className="truncate font-mono text-xs text-muted">{s.serial}</span>
                      <Badge tone={s.status === 'running' ? 'success' : s.status === 'error' ? 'danger' : 'neutral'}>{s.status}</Badge>
                    </div>
                    <Button size="sm" variant="secondary" className="mt-2 w-full" onClick={() => stop(s)}>
                      <Square className="h-3.5 w-3.5" /> Stop
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        open={restartPromptOpen}
        title="Restart mirroring?"
        message="Your settings changed. Restart mirroring to apply them?"
        confirmLabel="Restart Mirroring"
        onConfirm={restart}
        onClose={() => setRestartPromptOpen(false)}
      />
    </Section>
  )
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}
