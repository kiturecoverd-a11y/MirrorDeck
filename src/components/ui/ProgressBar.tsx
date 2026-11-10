import { cx } from '../../lib/cn'

export function ProgressBar({
  value,
  max = 100,
  className,
}: {
  value: number
  max?: number
  className?: string
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--surface-2))]', className)}>
      <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}
