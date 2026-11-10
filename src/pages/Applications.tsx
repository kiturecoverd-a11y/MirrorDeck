import { useCallback, useEffect, useState } from 'react'
import { LayoutGrid, RefreshCw, Search, PackagePlus, Play, Ban, Trash2 } from 'lucide-react'
import { Section } from '../components/Section'
import { DevicePicker } from '../components/DevicePicker'
import { Badge, Button, ConfirmDialog, EmptyState, IconButton, Input, Spinner, Tooltip } from '../components/ui'
import { useDevices, notify } from '../lib/store'
import { api } from '../lib/api'
import type { AppPackage } from '../lib/types'

export function ApplicationsPage() {
  const devices = useDevices((s) => s.devices)
  const [serial, setSerial] = useState<string | undefined>()
  const [packages, setPackages] = useState<AppPackage[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uninstalling, setUninstalling] = useState<AppPackage | null>(null)

  const connected = devices.filter((d) => d.state === 'device')

  const load = useCallback(async (s?: string) => {
    const target = s ?? serial
    if (!target) return
    setLoading(true)
    try {
      setPackages(await api.list_packages(target))
    } catch (e) {
      notify({ kind: 'error', title: 'Failed to list applications', message: (e as Error).message })
      setPackages([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serial])

  useEffect(() => {
    if (serial) load(serial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serial])

  const install = async () => {
    if (!serial) return
    const apk = await api.pick_file(['apk'])
    if (!apk) return
    setBusy(true)
    try {
      await api.install_apk(serial, apk)
      notify({ kind: 'success', title: 'APK installed' })
      load(serial)
    } catch (e) {
      notify({ kind: 'error', title: 'Install failed', message: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const launch = async (pkg: string) => {
    if (!serial) return
    try {
      await api.launch_package(serial, pkg)
    } catch (e) {
      notify({ kind: 'error', title: 'Launch failed', message: (e as Error).message })
    }
  }

  const forceStop = async (pkg: string) => {
    if (!serial) return
    try {
      await api.force_stop_package(serial, pkg)
      notify({ kind: 'info', title: 'Force-stopped', message: pkg })
    } catch (e) {
      notify({ kind: 'error', title: 'Force-stop failed', message: (e as Error).message })
    }
  }

  const doUninstall = async () => {
    if (!serial || !uninstalling) return
    try {
      await api.uninstall_package(serial, uninstalling.packageName)
      notify({ kind: 'success', title: 'Uninstalled', message: uninstalling.packageName })
      load(serial)
    } catch (e) {
      notify({ kind: 'error', title: 'Uninstall failed', message: (e as Error).message })
    } finally {
      setUninstalling(null)
    }
  }

  const filtered = packages.filter((p) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (p.packageName + ' ' + (p.label ?? '')).toLowerCase().includes(q)
  })

  return (
    <Section
      title="Applications"
      subtitle="Installed packages on the selected device."
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => load(serial)} disabled={!serial || loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={install} disabled={!serial || busy}>
            <PackagePlus className="h-4 w-4" /> Install APK
          </Button>
        </div>
      }
    >
      {connected.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No device connected" description="Connect a device to manage its applications." />
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-64 shrink-0">
              <DevicePicker value={serial} onChange={setSerial} />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search packages…" />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[rgb(var(--border))] py-10 text-center text-xs text-muted">
              No applications found.
            </p>
          ) : (
            <ul className="divide-y divide-[rgb(var(--border))] overflow-hidden rounded-xl border border-[rgb(var(--border))]">
              {filtered.map((p) => (
                <li key={p.packageName} className="flex items-center gap-3 bg-[rgb(var(--surface))] px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{p.label ?? p.packageName}</p>
                    <p className="truncate font-mono text-xs text-muted">
                      {p.packageName}
                      {p.versionName ? ` · v${p.versionName}` : ''}
                    </p>
                  </div>
                  {p.isSystem && <Badge tone="neutral">system</Badge>}
                  <div className="flex items-center gap-1">
                    <Tooltip label="Launch" side="top">
                      <IconButton onClick={() => launch(p.packageName)} aria-label="Launch">
                        <Play className="h-4 w-4" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip label="Force stop" side="top">
                      <IconButton onClick={() => forceStop(p.packageName)} aria-label="Force stop">
                        <Ban className="h-4 w-4" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip label="Uninstall" side="top">
                      <IconButton onClick={() => setUninstalling(p)} aria-label="Uninstall">
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!uninstalling}
        title="Uninstall application"
        message={`Uninstall “${uninstalling?.packageName ?? ''}”?`}
        confirmLabel="Uninstall"
        danger
        onConfirm={doUninstall}
        onClose={() => setUninstalling(null)}
      />
    </Section>
  )
}
