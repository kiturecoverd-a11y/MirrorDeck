import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/cn'

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function IconButton({ className, type = 'button', ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          'inline-flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--text-muted))] transition-colors hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50',
          className,
        )}
        {...rest}
      />
    )
  },
)
