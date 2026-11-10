import { useState } from 'react'
import { Smartphone, RefreshCw, Tag } from 'lucide-react'
import { Section } from '../components/Section'
import { DeviceCard } from '../components/DeviceCard'
import { Button, ConfirmDialog, EmptyState, Input, Modal } from '../components/ui'
import { useDevices, useSessions, useNav, notify } from '../lib/store'
import { api } from '../lib/api'
import type { DeviceInfo } from '../lib/types'

export function DevicesPage() {
  const devices = useDevices((s) => s.devices)
  const loading = useDevices((s) => s.loading)
  const refresh = useDevices((s) => s.refresh)
  const startSession = useSessions((s) => s.start)
  const setActive = useNav((s) => s.setActive)

  const [renaming, setRenaming] = useState<DeviceInfo | null>(null)
  const [alias, setAlias] = useState('')
  const [forgetting, setForgetting] = useState<DeviceInfo | null>(null)

  const startMirror = async (serial: string) => {
    try {
      await startSession({
        serial,
        maxSize: 0,
        maxFps: 60,
        videoBitRateMbps: 8,
        videoCodec: 'h264',
        noAudio: false,
        stayAwake: true,
        turnScreenOff: false,
        fullscreen: false,
        record: false,
      })
      notify({ kind: 'success', title: 'Mirroring started', message: serial })
      setActive('mirror')
    } catch (e) {
      notify({ kind: 'error', title: 'Failed to start mirroring', message: (e as Error).message })
    }
  }

  const disconnect = async (serial: string) => {
    try {
      await api.disconnect_device(serial)
      notify({ kind: 'info', title: 'Device disconnected', message: serial })
      refresh()
    } catch (e) {
      notify({ kind: 'error', title: 'Disconnect failed', message: (e as Error).message })
    }
  }

  const saveRename = async () => {
    if (!renaming) return
    try {
      await api.rename_device(renaming.serial, alias.trim())
      notify({ kind: 'success', title: 'Device renamed' })
      refresh()
    } catch (e) {
      notify({ kind: 'error', title: 'Rename failed', message: (e as Error).message })
    } finally {
      setRenaming(null)
    }
  }

  const doForget = async () => {
    if (!forgetting) return
    try {
      await api.forget_device(forgetting.serial)
      notify({ kind: 'info', title: 'Device forgotten', message: forgetting.serial })
      refresh()
    } catch (e) {
      notify({ kind: 'error', title: 'Forget failed', message: (e as Error).message })
    } finally {
      setForgetting(null)
    }
  }

  return (
    <Section
      title="Devices"
      subtitle="Connected and saved Android devices."
      actions={
        <Button variant="secondary" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      }
    >
      {devices.length === 0 ? (
        <EmptyState
          icon={Smartphone}
          title="No devices detected"
          description="Enable USB debugging on your phone and connect it, or use Wireless Connect to pair over Wi-Fi."
        >
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={refresh}>
              Scan again
            </Button>
            <Button size="sm" onClick={() => setActive('wireless')}>
              Wireless Connect
            </Button>
          </div>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {devices.map((d) => (
            <DeviceCard
              key={d.serial}
              device={d}
              onMirror={startMirror}
              onDisconnect={disconnect}
              onRename={(dev) => {
                setRenaming(dev)
                setAlias(dev.localAlias ?? '')
              }}
              onForget={(dev) => setForgetting(dev)}
            />
          ))}
        </div>
      )}

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename device">
        <div className="space-y-4">
          <Input
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="Local alias (e.g. Pixel 8)"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button onClick={saveRename}>
              <Tag className="h-4 w-4" /> Save
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!forgetting}
        title="Forget device"
        message={`Remove ${forgetting?.serial ?? ''} from saved devices?`}
        confirmLabel="Forget"
        danger
        onConfirm={doForget}
        onClose={() => setForgetting(null)}
      />
    </Section>
  )
}
