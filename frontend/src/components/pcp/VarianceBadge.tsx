import { cn } from '@/lib/utils'

export function VarianceBadge({ value }: { value?: number }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>
  const over = value > 0
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
        over ? 'bg-primary/15 text-primary' : 'bg-emerald-500/15 text-emerald-700'
      )}
    >
      {over ? '+' : '−'}{Math.abs(value).toFixed(1)}% {over ? 'over' : 'under'} budget
    </span>
  )
}
