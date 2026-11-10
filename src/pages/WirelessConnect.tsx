import { useState } from 'react'
import { Wifi, Cable, Info, CheckCircle2 } from 'lucide-react'
import { Section } from '../components/Section'
import { DevicePicker } from '../components/DevicePicker'
import { Badge, Button, EmptyState, Input, Segmented } from '../components/ui'
import { useDevices, notify } from '../lib/store'
import { api } from '../lib/api'

type Mode = 'pair' | 'tcpip' | 'usb-enable'

export function WirelessConnectPage() {
  const devices = useDevices((s) => s.devices)
  const refresh = useDevices((s) => s.refresh)

  const [mode, setMode] = useState<Mode>('pair')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('')
  const [code, setCode] = useState('')
  const [serial, setSerial] = useState<string | undefined>()
  const [tcpipPort, setTcpipPort] = useState('5555')
  const [busy, setBusy] = useState(false)

  const tcpipDevices = devices.filter((d) => d.connection === 'tcpip' && d.state === 'device')
  const pairPort = Number(port)
  const pairingInputValid =
    host.trim().length > 0 &&
    /^\d{1,5}$/.test(port) &&
    Number.isInteger(pairPort) &&
    pairPort > 0 &&
    pairPort <= 65535 &&
    /^\d{6}$/.test(code)

  const pair = async () => {
    setBusy(true)
    try {
      const result = await api.wireless_pair({ host: host.trim(), port: Number(port), code: code.trim() })
      notify({ kind: 'success', title: 'Pairing successful', message: result.serial })
      refresh()
    } catch (e) {
      notify({ kind: 'error', title: 'Pairing failed', message: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const connectTcpip = async () => {
    setBusy(true)
    try {
      await api.tcpip_connect({ host: host.trim(), port: Number(port) })
      notify({ kind: 'success', title: 'Connected', message: `${host}:${port}` })
      refresh()
    } catch (e) {
      notify({ kind: 'error', title: 'Connection failed', message: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const enableTcpip = async () => {
    if (!serial) return
    setBusy(true)
    try {
      await api.tcpip_enable({ serial, port: Number(tcpipPort) })
      notify({ kind: 'success', title: 'TCP/IP mode enabled', message: `Port ${tcpipPort}` })
    } catch (e) {
      notify({ kind: 'error', title: 'Failed to enable TCP/IP', message: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section
      title="Wireless Connect"
      subtitle="Pair and connect to Android devices over your local network."
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3 text-xs text-muted">
          <span className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Your phone and computer must be reachable on the same local network (Wi-Fi). Device IPs and
            pairing codes are entered exactly as shown in Android&apos;s Wireless debugging screen.
          </span>
        </div>

        <Segmented<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'pair', label: 'Wireless pairing' },
            { value: 'tcpip', label: 'TCP/IP (manual)' },
            { value: 'usb-enable', label: 'Enable via USB' },
          ]}
        />

        {mode === 'pair' && (
          <div className="card space-y-4 p-5">
            <Step n={1} title="Open Wireless debugging on your phone" body="Developer options → Wireless debugging → Pair device with pairing code." />
            <Step n={2} title="Enter the pairing details" body="Use the IP address, pairing port, and 6-digit code shown in the phone’s “Pair device with pairing code” dialog—not the regular Wireless debugging port. Keep the dialog open while pairing." />
            <div className="grid grid-cols-2 gap-3">
              <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="IP address (e.g. 192.168.1.20)" />
              <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="Port (e.g. 37015)" />
            </div>
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit pairing code" maxLength={6} />
            <Button onClick={pair} disabled={busy || !pairingInputValid}>
              <Wifi className="h-4 w-4" /> Pair
            </Button>
          </div>
        )}

        {mode === 'tcpip' && (
          <div className="card space-y-4 p-5">
            <Step n={1} title="Ensure the device listens on TCP/IP" body="Use “Enable via USB” first, or run adb tcpip 5555 over USB, then unplug." />
            <Step n={2} title="Connect to the device endpoint" />
            <div className="grid grid-cols-2 gap-3">
              <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="IP address" />
              <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="Port (default 5555)" />
            </div>
            <Button onClick={connectTcpip} disabled={busy || !host || !port}>
              <Cable className="h-4 w-4" /> Connect
            </Button>
          </div>
        )}

        {mode === 'usb-enable' && (
          <div className="card space-y-4 p-5">
            <Step n={1} title="Connect the phone over USB" body="Select a USB-connected device below." />
            <DevicePicker value={serial} onChange={setSerial} />
            <Input value={tcpipPort} onChange={(e) => setTcpipPort(e.target.value)} placeholder="TCP/IP port (5555)" />
            <Button onClick={enableTcpip} disabled={busy || !serial}>
              <CheckCircle2 className="h-4 w-4" /> Enable TCP/IP mode
            </Button>
          </div>
        )}

        <div className="card p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Connected over Wi-Fi</h3>
          {tcpipDevices.length === 0 ? (
            <EmptyState icon={Wifi} title="No wireless devices" description="Paired devices will appear here once connected." />
          ) : (
            <ul className="space-y-2">
              {tcpipDevices.map((d) => (
                <li key={d.serial} className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] px-3 py-2">
                  <div>
                    <p className="text-[13px] font-medium">{d.localAlias || d.model || 'Android device'}</p>
                    <p className="font-mono text-xs text-muted">{d.serial}</p>
                  </div>
                  <Badge tone="success">Connected</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-[rgb(var(--border))] p-4 text-xs text-muted">
          <p className="mb-1 font-semibold text-[rgb(var(--text))]">Troubleshooting</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Pairing fails? Confirm the phone and PC are on the same network and the code is current (codes rotate).</li>
            <li>Connection drops? Re-enable TCP/IP mode over USB and reconnect.</li>
            <li>Firewall? Allow adb.exe through your firewall for LAN access.</li>
          </ul>
        </div>
      </div>
    </Section>
  )
}

function Step({ n, title, body }: { n: number; title: string; body?: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
        {n}
      </div>
      <div>
        <p className="text-[13px] font-medium">{title}</p>
        {body && <p className="text-xs text-muted">{body}</p>}
      </div>
    </div>
  )
}
