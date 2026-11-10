import { useEffect, useState } from 'react'
import { Camera, Clapperboard, FolderOpen, Play, RefreshCw } from 'lucide-react'
import { Section } from '../components/Section'
import { DevicePicker } from '../components/DevicePicker'
import { Badge, Button, EmptyState, IconButton } from '../components/ui'
import { useDevices, useSessions, notify } from '../lib/store'
import { api } from '../lib/api'
import type { RecordingInfo } from '../lib/types'
import { formatBytes, formatDuration, formatRelativeTime } from '../lib/format'

export function RecordingStudioPage() {
  const devices = useDevices((s) => s.devices)
  const startSession = useSessions((s) => s.start)
  const [serial, setSerial] = useState<string | undefined>()
  const [recordings, setRecordings] = useState<RecordingInfo[]>([])
  const [busy, setBusy] = useState(false)

  const connected = devices.filter((d) => d.state === 'device')

  const load = () => {
    api.get_recordings().then(setRecordings).catch(() => setRecordings([]))
  }

  useEffect(load, [])

  const screenshot = async () => {
    if (!serial) return
    const dest = await api.save_file(`mirrordeck-${Date.now()}.png`)
    if (!dest) return
    try {
      const path = await api.take_screenshot(serial, dest)
      notify({ kind: 'success', title: 'Screenshot saved', message: path })
    } catch (e) {
      notify({ kind: 'error', title: 'Screenshot failed', message: (e as Error).message })
    }
  }

  const record = async () => {
    if (!serial) return
    const dir = await api.pick_folder()
    if (!dir) return
    const path = `${dir.replace(/[\\/]$/, '')}/mirrordeck-${Date.now()}.mp4`
    setBusy(true)
    try {
      await startSession({
        serial,
        maxSize: 0,
        maxFps: 60,
        videoBitRateMbps: 16,
        videoCodec: 'h265',
        noAudio: false,
        stayAwake: true,
        turnScreenOff: false,
        fullscreen: false,
        record: true,
        recordPath: path,
      })
      notify({ kind: 'success', title: 'Recording started', message: path })
    } catch (e) {
      notify({ kind: 'error', title: 'Recording failed to start', message: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section
      title="Recording Studio"
      subtitle="Capture screenshots and record device sessions."
      actions={
        <IconButton onClick={load} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </IconButton>
      }
    >
      {connected.length === 0 ? (
        <EmptyState icon={Clapperboard} title="No device connected" description="Connect a device to capture screenshots or record." />
      ) : (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-end gap-3 p-5">
            <div className="w-64">
              <DevicePicker value={serial} onChange={setSerial} />
            </div>
            <Button variant="secondary" onClick={screenshot} disabled={!serial}>
              <Camera className="h-4 w-4" /> Capture screenshot
            </Button>
            <Button onClick={record} disabled={!serial || busy}>
              <Play className="h-4 w-4" /> Start recording
            </Button>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 text-[15px] font-semibold">Recording history</h3>
            {recordings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[rgb(var(--border))] py-8 text-center text-xs text-muted">
                No recordings yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {recordings.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{r.filePath.split(/[\\/]/).pop()}</p>
                      <p className="text-xs text-muted">
                        {formatRelativeTime(r.startedAt)}
                        {r.durationSec != null && ` · ${formatDuration(r.durationSec)}`}
                        {r.sizeBytes != null && ` · ${formatBytes(r.sizeBytes)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={r.status === 'completed' ? 'success' : r.status === 'failed' ? 'danger' : 'accent'}>{r.status}</Badge>
                      <IconButton onClick={() => api.open_path(r.filePath)} aria-label="Open in folder">
                        <FolderOpen className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Section>
  )
}
