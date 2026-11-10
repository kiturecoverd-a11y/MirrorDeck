import type { HTMLAttributes } from 'react'
import { cx } from '../../lib/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('card', className)} {...rest} />
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('flex items-center justify-between gap-3 px-5 pt-5', className)} {...rest} />
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cx('text-[15px] font-semibold', className)} {...rest} />
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('p-5', className)} {...rest} />
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('flex items-center justify-end gap-2 border-t border-[rgb(var(--border))] px-5 py-4', className)} {...rest} />
}
