import type { HTMLAttributes } from 'react'
import { cx } from '../../lib/cn'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'bg-[rgb(var(--surface-2))] text-[rgb(var(--text-muted))]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent)]',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  danger: 'bg-red-500/10 text-red-700 dark:text-red-300',
}

export function Badge({
  tone = 'neutral',
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        tones[tone],
        className,
      )}
      {...rest}
    />
  )
}
