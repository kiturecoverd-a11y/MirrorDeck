import type { ReactNode } from 'react'
import { cx } from '../../lib/cn'

type Side = 'top' | 'bottom' | 'left' | 'right'

const positionClass: Record<Side, string> = {
  top: 'bottom-full left-1/2 mb-1 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-1 -translate-x-1/2',
  left: 'right-full top-1/2 mr-1 -translate-y-1/2',
  right: 'left-full top-1/2 ml-1 -translate-y-1/2',
}

export function Tooltip({
  label,
  children,
  side = 'top',
}: {
  label: string
  children: ReactNode
  side?: Side
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cx(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-[rgb(var(--text))] px-2 py-1 text-[11px] font-medium text-[rgb(var(--bg))] opacity-0 transition-opacity duration-150 group-hover:opacity-100',
          positionClass[side],
        )}
      >
        {label}
      </span>
    </span>
  )
}
