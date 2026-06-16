import { cn } from '@/lib/utils'
import type { PcpStatus } from '@/types'

const styles: Record<PcpStatus, string> = {
  Draft: 'bg-gray-500/15 text-gray-700 dark:text-gray-300',
  'In Approval': 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  Approved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  Rejected: 'bg-red-500/15 text-red-700 dark:text-red-400',
  Returned: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  Closed: 'bg-gray-700/15 text-gray-800 dark:text-gray-200',
}

export function PcpStatusChip({ status, className }: { status: PcpStatus | string; className?: string }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', styles[status as PcpStatus] || styles.Draft, className)}>
      {status}
    </span>
  )
}
