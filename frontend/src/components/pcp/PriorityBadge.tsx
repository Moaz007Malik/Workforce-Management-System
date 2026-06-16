import { cn } from '@/lib/utils'

export function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'Critical') {
    return (
      <span className="inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
        Critical
      </span>
    )
  }
  if (priority === 'Urgent') {
    return (
      <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        Urgent
      </span>
    )
  }
  return (
    <span className={cn('text-sm text-muted-foreground')}>{priority}</span>
  )
}
