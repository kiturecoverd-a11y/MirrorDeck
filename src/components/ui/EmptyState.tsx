import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgb(var(--border))] px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--surface-2))]">
        <Icon className="h-6 w-6 text-[rgb(var(--text-muted))]" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-xs text-muted">{description}</p>}
      </div>
      {children}
    </div>
  )
}
