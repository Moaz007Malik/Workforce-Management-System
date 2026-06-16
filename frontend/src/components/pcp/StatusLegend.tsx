import { PcpStatusChip } from '@/components/pcp/PcpStatusChip'
import type { PcpStatus } from '@/types'
import { cn } from '@/lib/utils'

const LEGEND: { status: PcpStatus; color: string }[] = [
  { status: 'Draft', color: 'bg-gray-500' },
  { status: 'In Approval', color: 'bg-amber-500' },
  { status: 'Approved', color: 'bg-emerald-500' },
  { status: 'Rejected', color: 'bg-red-500' },
  { status: 'Returned', color: 'bg-blue-500' },
  { status: 'Closed', color: 'bg-gray-700' },
]

interface StatusLegendProps {
  compact?: boolean
  className?: string
}

export function StatusLegend({ compact, className }: StatusLegendProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-muted/30 p-2 sm:p-3', className)}>
      {!compact && (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          PCP Status
        </p>
      )}
      <div className={cn('flex flex-wrap gap-x-3 gap-y-1.5', compact && 'gap-x-2 gap-y-1')}>
        {LEGEND.map(({ status, color }) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', color)} />
            {compact ? (
              <span className="text-[10px] text-muted-foreground">{status}</span>
            ) : (
              <PcpStatusChip status={status} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
