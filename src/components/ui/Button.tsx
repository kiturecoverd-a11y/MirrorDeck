import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cx } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-[var(--accent)] text-white hover:brightness-95 active:brightness-90 disabled:opacity-50',
  secondary:
    'bg-[rgb(var(--surface-2))] text-[rgb(var(--text))] hover:bg-[rgb(var(--border))]',
  ghost: 'text-[rgb(var(--text))] hover:bg-[rgb(var(--surface-2))]',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60',
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...rest}
    />
  )
})
