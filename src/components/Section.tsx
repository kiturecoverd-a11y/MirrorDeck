import type { ReactNode } from 'react'
import { cx } from '../lib/cn'

export function Section({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex h-full flex-col overflow-hidden', className)}>
      <div className="flex shrink-0 items-center justify-between px-6 pb-4 pt-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
    </div>
  )
}
