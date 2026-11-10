import { useEffect, useState, type ReactNode } from 'react'
import { Info, MonitorPlay, Smartphone, RefreshCw, LifeBuoy } from 'lucide-react'
import { Section } from '../components/Section'
import { Badge, Button } from '../components/ui'
import { api } from '../lib/api'
import { notify, useTheme } from '../lib/store'
import type { DependencyStatus } from '../lib/types'
import logoImg from '../assets/logo.png'
import wordmarkLight from '../assets/wordmark_light.png'
import wordmarkDark from '../assets/wordmark_dark.png'

export function AboutPage() {
  const [deps, setDeps] = useState<DependencyStatus | null>(null)
  const resolved = useTheme((s) => s.resolved)

  useEffect(() => {
    api.get_dependency_status().then(setDeps).catch(() => setDeps(null))
  }, [])

  const wordmarkImg = resolved === 'light' ? wordmarkLight : wordmarkDark

  return (
    <Section title="About" subtitle="MirrorDeck — premium Android device management & screen mirroring.">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="card p-6 text-center">
          <div className="relative mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-b from-[#1c1f2e] to-[#0d0f17] p-2 shadow-xl ring-1 ring-violet-500/30">
            <img
              src={logoImg}
              alt="MirrorDeck Logo"
              className="h-full w-full rounded-xl object-contain filter drop-shadow-[0_4px_12px_rgba(139,92,246,0.45)]"
            />
          </div>
          <div className="mx-auto mb-2 flex justify-center">
            <img src={wordmarkImg} alt="MirrorDeck" className="h-6 object-contain" />
          </div>
          <p className="text-xs font-medium text-violet-400">Version 0.1.0</p>
          <p className="mx-auto mt-3 max-w-md text-[13px] text-muted">
            A lightweight desktop application for managing Android devices and mirroring their screens,
            powered by the official Nova engine and Android Debug Bridge.
          </p>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Engines</h3>
          <div className="space-y-2">
            <EngineRow icon={<Smartphone className="h-4 w-4" />} name="ADB" found={deps?.adb.found} version={deps?.adb.version} />
            <EngineRow icon={<MonitorPlay className="h-4 w-4" />} name="Nova" found={deps?.scrcpy.found} version={deps?.scrcpy.version} />
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Troubleshooting</h3>
          <ul className="list-inside list-disc space-y-1.5 text-[13px] text-muted">
            <li>ADB missing? Run <code className="font-mono text-xs">scripts/bootstrap.ps1</code> or install platform-tools and set its path in Settings.</li>
            <li>Device not detected? Enable Developer options → USB debugging, and accept the RSA prompt on the phone.</li>
            <li>Control not working (Xiaomi)? Enable “USB debugging (Security settings)” and reboot.</li>
            <li>Mirroring fails? Ensure Nova is present and the device runs Android 5.0 or newer.</li>
          </ul>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
            <LifeBuoy className="h-4 w-4" /> Licensing & attribution
          </h3>
          <p className="text-[13px] text-muted">
            MirrorDeck integrates the open-source Nova engine (Apache License 2.0, © Genymobile / Romain
            Vimont) and the Android Debug Bridge from the Android SDK platform-tools (Apache License 2.0).
            Full license texts are preserved in <code className="font-mono text-xs">docs/licenses/</code>.
            No third-party telemetry or accounts are used.
          </p>
          <div className="mt-3">
            <Button size="sm" variant="secondary" onClick={() => api.check_for_updates().then((u) => notify({ kind: 'info', title: u ? `Update ${u.version} available` : 'You are up to date' })).catch(() => notify({ kind: 'error', title: 'Update check failed' }))}>
              <RefreshCw className="h-3.5 w-3.5" /> Check for updates
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted">
          <Info className="h-4 w-4" />
          <span>Built with Tauri 2, Rust, React, and TypeScript. Works offline.</span>
        </div>
      </div>
    </Section>
  )
}

function EngineRow({ icon, name, found, version }: { icon: ReactNode; name: string; found?: boolean; version?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[rgb(var(--border))] px-3 py-2">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-muted">{icon}</span>
        <span className="font-medium">{name}</span>
      </div>
      <Badge tone={found ? 'success' : 'danger'}>{found ? version || 'Detected' : 'Not found'}</Badge>
    </div>
  )
}
