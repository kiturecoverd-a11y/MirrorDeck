import { useEffect, useState, type ReactNode } from 'react'
import { Gauge, Battery, Thermometer, Cpu, MemoryStick } from 'lucide-react'
import { Section } from '../components/Section'
import { DevicePicker } from '../components/DevicePicker'
import { EmptyState } from '../components/ui'
import { useDevices } from '../lib/store'
import { api } from '../lib/api'
import type { PerformanceSnapshot } from '../lib/types'

export function PerformancePage() {
  const devices = useDevices((s) => s.devices)
  const [serial, setSerial] = useState<string | undefined>()
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot | null>(null)
  const [usage, setUsage] = useState<{ cpuPercent: number; memoryMB: number } | null>(null)

  const connected = devices.filter((d) => d.state === 'device')

  useEffect(() => {
    if (!serial) return
    let alive = true
    const tick = async () => {
      try {
        const [perf, res] = await Promise.all([api.get_performance(serial), api.app_resource_usage()])
        if (alive) {
          setSnapshot(perf)
          setUsage(res)
        }
      } catch {
        // backend unavailable — leave last values
      }
    }
    tick()
    const id = setInterval(tick, 2000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [serial])

  return (
    <Section title="Performance" subtitle="Live device and application metrics that are actually measurable.">
      {connected.length === 0 ? (
        <EmptyState icon={Gauge} title="No device connected" description="Connect a device to view its metrics." />
      ) : (
        <div className="space-y-4">
          <div className="w-64">
            <DevicePicker value={serial} onChange={setSerial} />
          </div>

          {snapshot ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Metric icon={<Battery className="h-4 w-4" />} label="Battery" value={snapshot.batteryLevel != null ? `${snapshot.batteryLevel}%${snapshot.batteryCharging ? ' · charging' : ''}` : '—'} />
              <Metric icon={<Gauge className="h-4 w-4" />} label="Resolution" value={snapshot.resolution ?? '—'} />
              <Metric icon={<Gauge className="h-4 w-4" />} label="Android" value={snapshot.androidVersion ?? '—'} />
              <Metric icon={<Thermometer className="h-4 w-4" />} label="Temperature" value={snapshot.temperatureC != null ? `${snapshot.temperatureC} °C` : 'Unavailable'} />
              <Metric icon={<Cpu className="h-4 w-4" />} label="App CPU" value={usage ? `${usage.cpuPercent.toFixed(1)}%` : '—'} />
              <Metric icon={<MemoryStick className="h-4 w-4" />} label="App RAM" value={usage ? `${usage.memoryMB.toFixed(0)} MB` : '—'} />
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-[rgb(var(--border))] py-8 text-center text-xs text-muted">
              Reading metrics…
            </p>
          )}

          <p className="text-xs text-muted">
            MirrorDeck does not overclock or unlock unsupported frame rates. Mirroring FPS, bitrate, and
            stream resolution are governed by the Nova session parameters in Screen Mirror. Device
            temperature is only shown when Android exposes it.
          </p>
        </div>
      )}
    </Section>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--surface-2))] text-[rgb(var(--text-muted))]">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}
