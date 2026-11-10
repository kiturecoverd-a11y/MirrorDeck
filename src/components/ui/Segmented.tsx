import { useId } from 'react'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cx } from '../../lib/cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: SegmentedOption<T>[]
  onChange: (v: T) => void
}) {
  const id = useId()
  return (
    <div className="inline-flex rounded-xl bg-[rgb(var(--surface-2))] p-0.5">
      {options.map((o) => {
        const Icon = o.icon
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cx(
              'relative flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors',
              selected ? 'text-[rgb(var(--text))]' : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[10px] bg-[rgb(var(--surface))] shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            {Icon && <Icon className="relative h-3.5 w-3.5" />}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
