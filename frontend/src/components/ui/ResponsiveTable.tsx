import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ResponsiveTableProps {
  children: ReactNode
  className?: string
}

/** Horizontal scroll wrapper for data tables on mobile / tablet */
export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn('-mx-1 overflow-x-auto overscroll-x-contain px-1 sm:mx-0 sm:px-0', className)}>
      {children}
    </div>
  )
}
