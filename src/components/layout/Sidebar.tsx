import { motion } from 'framer-motion'
import {
  Home,
  Smartphone,
  MonitorPlay,
  Wifi,
  FolderOpen,
  LayoutGrid,
  Clapperboard,
  Workflow,
  Gauge,
  History,
  Settings,
  Info,
  type LucideIcon,
} from 'lucide-react'
import { cx } from '../../lib/cn'

export interface SectionDef {
  id: string
  label: string
  icon: LucideIcon
}

export const SECTIONS: SectionDef[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'devices', label: 'Devices', icon: Smartphone },
  { id: 'mirror', label: 'Screen Mirror', icon: MonitorPlay },
  { id: 'wireless', label: 'Wireless Connect', icon: Wifi },
  { id: 'files', label: 'File Manager', icon: FolderOpen },
  { id: 'apps', label: 'Applications', icon: LayoutGrid },
  { id: 'recording', label: 'Recording Studio', icon: Clapperboard },
  { id: 'automation', label: 'Automation', icon: Workflow },
  { id: 'performance', label: 'Performance', icon: Gauge },
  { id: 'history', label: 'Connection History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'about', label: 'About', icon: Info },
]

export function Sidebar({
  active,
  onSelect,
  adbAvailable,
}: {
  active: string
  onSelect: (id: string) => void
  adbAvailable: boolean
}) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {SECTIONS.map((item) => {
          const Icon = item.icon
          const selected = item.id === active
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cx(
                'relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition-colors',
                selected ? 'text-[rgb(var(--text))]' : 'text-muted hover:bg-[rgb(var(--surface-2))]',
              )}
            >
              {selected && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl bg-[rgb(var(--surface-2))]"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className="relative h-[18px] w-[18px]" strokeWidth={1.75} />
              <span className="relative">{item.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="border-t border-[rgb(var(--border))] px-4 py-3">
        <div className="flex items-center gap-2 text-xs">
          <span className={cx('h-2 w-2 rounded-full', adbAvailable ? 'bg-emerald-500' : 'bg-[rgb(var(--text-muted))]')} />
          <span className="text-muted">{adbAvailable ? 'ADB ready' : 'ADB unavailable'}</span>
        </div>
      </div>
    </aside>
  )
}
