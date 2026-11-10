import { forwardRef, type InputHTMLAttributes } from 'react'
import { cx } from '../../lib/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cx(
          'h-9 w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm text-[rgb(var(--text))] placeholder:text-[rgb(var(--text-muted))] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50',
          className,
        )}
        {...rest}
      />
    )
  },
)
