import { Smartphone, Battery, BatteryCharging, MonitorPlay, Unplug, Pencil, Trash2 } from 'lucide-react'
import type { DeviceInfo } from '../lib/types'
import { Badge, Button, IconButton, Tooltip } from './ui'

function statusTone(state: DeviceInfo['state']): 'success' | 'warning' | 'neutral' {
  if (state === 'device') return 'success'
  if (state === 'unauthorized') return 'warning'
  return 'neutral'
}

function statusLabel(state: DeviceInfo['state']): string {
  switch (state) {
    case 'device':
      return 'Connected'
    case 'unauthorized':
      return 'Authorize on device'
    case 'offline':
      return 'Offline'
    case 'recovery':
      return 'Recovery'
    default:
      return state
  }
}

export function DeviceCard({
  device,
  onMirror,
  onDisconnect,
  onRename,
  onForget,
}: {
  device: DeviceInfo
  onMirror: (serial: string) => void
  onDisconnect: (serial: string) => void
  onRename?: (device: DeviceInfo) => void
  onForget?: (device: DeviceInfo) => void
}) {
  const connected = device.state === 'device'
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Smartphone className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {device.localAlias || device.model || 'Android device'}
            </p>
            <p className="truncate font-mono text-xs text-muted">{device.serial}</p>
          </div>
        </div>
        <Badge tone={statusTone(device.state)}>{statusLabel(device.state)}</Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        {device.batteryLevel != null && (
          <span className="flex items-center gap-1">
            {device.batteryCharging ? (
              <BatteryCharging className="h-3.5 w-3.5" />
            ) : (
              <Battery className="h-3.5 w-3.5" />
            )}
            {device.batteryLevel}%
          </span>
        )}
        {device.androidVersion && <span>Android {device.androidVersion}</span>}
        {device.resolution && <span>{device.resolution}</span>}
        <span className="uppercase tracking-wide">{device.connection}</span>
      </div>

      <div className="mt-4 flex items-center gap-1">
        <Button size="sm" variant="primary" disabled={!connected} onClick={() => onMirror(device.serial)}>
          <MonitorPlay className="h-4 w-4" />
          Mirror
        </Button>
        <Tooltip label="Rename" side="top">
          <IconButton onClick={() => onRename?.(device)} aria-label="Rename">
            <Pencil className="h-4 w-4" />
          </IconButton>
        </Tooltip>
        <Tooltip label="Forget" side="top">
          <IconButton onClick={() => onForget?.(device)} aria-label="Forget">
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </Tooltip>
        <div className="ml-auto">
          <Tooltip label="Disconnect" side="top">
            <IconButton onClick={() => onDisconnect(device.serial)} disabled={!connected} aria-label="Disconnect">
              <Unplug className="h-4 w-4" />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
