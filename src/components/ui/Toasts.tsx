import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react'
import { useNotifications } from '../../lib/store'
import { cx } from '../../lib/cn'
import { IconButton } from './IconButton'

const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle }
const tones = {
  info: 'text-[var(--accent)]',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
}

export function Toasts() {
  const items = useNotifications((s) => s.items)
  const dismiss = useNotifications((s) => s.dismiss)

  useEffect(() => {
    if (items.length === 0) return
    const newest = items[items.length - 1]
    if (newest.kind === 'success') {
      const t = setTimeout(() => dismiss(newest.id), 4000)
      return () => clearTimeout(t)
    }
  }, [items, dismiss])

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      <AnimatePresence>
        {items.map((t) => {
          const Icon = icons[t.kind]
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 shadow-pop"
            >
              <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', tones[t.kind])} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">{t.title}</p>
                {t.message && <p className="mt-0.5 text-xs text-muted">{t.message}</p>}
              </div>
              <IconButton onClick={() => dismiss(t.id)} aria-label="Dismiss" className="h-6 w-6">
                <X className="h-3.5 w-3.5" />
              </IconButton>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
