import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

function getModalRoot() {
  return document.getElementById('modal-root') ?? document.body
}

export function Dialog({ open, onClose, title, description, children, footer, className }: DialogProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      style={{ width: '100vw', height: '100dvh' }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          'relative z-10 flex w-full max-w-2xl flex-col rounded-xl border border-border bg-card text-card-foreground shadow-2xl',
          'max-h-[min(90vh,calc(100dvh-2rem))]',
          className
        )}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-border px-6 py-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-border bg-card px-6 py-4">{footer}</div>
        )}
      </div>
    </div>,
    getModalRoot()
  )
}
