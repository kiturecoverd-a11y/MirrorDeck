import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/cn'
import { IconButton } from './IconButton'

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 'max-w-md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            className={cx(
              'relative w-full rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-pop',
              width,
            )}
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold">{title}</h3>
              <IconButton onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
