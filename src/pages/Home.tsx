import { useEffect, useState, type ReactNode } from 'react'
import {
  Smartphone,
  MonitorPlay,
  Wifi,
  Clapperboard,
  CheckCircle2,
  XCircle,
  ArrowRight,
  PlugZap,
} from 'lucide-react'
import { Section } from '../components/Section'
import { Badge, Button, EmptyState, Spinner } from '../components/ui'
import { useDevices, useNav, notify } from '../lib/store'
import { api } from '../lib/api'
import type { DependencyStatus, RecordingInfo } from '../lib/types'
import { formatRelativeTime } from '../lib/format'

export function HomePage() {
  const devices = useDevices((s) => s.devices)
  const loading = useDevices((s) => s.loading)
  const setActive = useNav((s) => s.setActive)
  const [deps, setDeps] = useState<DependencyStatus | null>(null)
  const [recordings, setRecordings] = useState<RecordingInfo[]>([])

  useEffect(() => {
    api.get_dependency_status().then(setDeps).catch(() => setDeps(null))
    api.get_recordings().then(setRecordings).catch(() => setRecordings([]))
  }, [])

  const connected = devices.filter((d) => d.state === 'device')

  const quickConnect = () => setActive('wireless')
  const startMirroring = () => {
    if (connected.length === 0) {
      notify({ kind: 'warning', title: 'No device connected', message: 'Connect a device over USB or Wi-Fi first.' })
      setActive('devices')
      return
    }
    setActive('mirror')
  }

  return (
    <Section
      title="Welcome"
      subtitle="Manage, mirror, and record your Android devices."
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={quickConnect}>
            <Wifi className="h-4 w-4" /> Quick Connect
          </Button>
          <Button onClick={startMirroring}>
            <MonitorPlay className="h-4 w-4" /> Start Mirroring
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Status strip */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatusCard
            icon={<Smartphone className="h-4 w-4" />}
            label="Connected devices"
            value={String(connected.length)}
            loading={loading}
          />
          <StatusCard
            icon={<PlugZap className="h-4 w-4" />}
            label="ADB"
            value={deps ? (deps.adb.found ? 'Ready' : 'Missing') : 'Checking…'}
            ok={deps?.adb.found}
          />
          <StatusCard
            icon={<MonitorPlay className="h-4 w-4" />}
            label="Nova"
            value={deps ? (deps.scrcpy.found ? 'Ready' : 'Missing') : 'Checking…'}
            ok={deps?.scrcpy.found}
          />
        </div>

        {/* Devices */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Connected devices</h3>
            <button type="button" onClick={() => setActive('devices')} className="flex items-center gap-1 text-xs text-[var(--accent)]">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {connected.length === 0 ? (
            <EmptyState
              icon={Smartphone}
              title="No devices connected"
              description="Plug in a device with USB debugging enabled, or pair over Wi-Fi to get started."
            >
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setActive('devices')}>
                  Open Devices
                </Button>
                <Button size="sm" onClick={() => setActive('wireless')}>
                  Wireless Connect
                </Button>
              </div>
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {connected.slice(0, 4).map((d) => (
                <button
                  key={d.serial}
                  type="button"
                  onClick={() => setActive('devices')}
                  className="card flex items-center justify-between p-4 text-left transition-colors hover:border-[var(--accent)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{d.localAlias || d.model || 'Android device'}</p>
                    <p className="truncate font-mono text-xs text-muted">{d.serial}</p>
                  </div>
                  <Badge tone="success">Connected</Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Recent recordings */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold">Recent recordings</h3>
            <button type="button" onClick={() => setActive('recording')} className="flex items-center gap-1 text-xs text-[var(--accent)]">
              Recording Studio <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {recordings.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[rgb(var(--border))] px-4 py-6 text-center text-xs text-muted">
              No recordings yet. Start one from the Recording Studio.
            </p>
          ) : (
            <ul className="space-y-2">
              {recordings.slice(0, 3).map((r) => (
                <li key={r.id} className="card flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Clapperboard className="h-4 w-4 text-muted" />
                    <div>
                      <p className="text-[13px] font-medium">{r.filePath.split(/[\\/]/).pop()}</p>
                      <p className="text-xs text-muted">{formatRelativeTime(r.startedAt)}</p>
                    </div>
                  </div>
                  <Badge tone={r.status === 'completed' ? 'success' : r.status === 'failed' ? 'danger' : 'accent'}>
                    {r.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Health */}
        {deps && (
          <div className="card p-4">
            <h3 className="mb-2 text-[15px] font-semibold">Application health</h3>
            <ul className="space-y-1.5 text-[13px]">
              <HealthRow ok={deps.adb.found} text={deps.adb.found ? `ADB ${deps.adb.version ?? ''}` : 'ADB not found'} />
              <HealthRow ok={deps.scrcpy.found} text={deps.scrcpy.found ? `Nova ${deps.scrcpy.version ?? ''}` : 'Nova not found'} />
            </ul>
          </div>
        )}
      </div>
    </Section>
  )
}

function StatusCard({
  icon,
  label,
  value,
  ok,
  loading,
}: {
  icon: ReactNode
  label: string
  value: string
  ok?: boolean
  loading?: boolean
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--surface-2))] text-[rgb(var(--text-muted))]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-sm font-semibold">
          {loading ? <Spinner className="h-3.5 w-3.5" /> : value}
        </p>
      </div>
      {ok !== undefined && (
        <span className="ml-auto">
          {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
        </span>
      )}
    </div>
  )
}

function HealthRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
      <span className="text-muted">{text}</span>
    </li>
  )
}
