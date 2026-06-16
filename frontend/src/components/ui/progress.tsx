import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  color?: 'default' | 'success' | 'warning' | 'danger'
}

export function Progress({ value, max = 100, className, showLabel, color = 'default' }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const barColor = {
    default: 'bg-primary',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  }[color]

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{value}h</span>
          <span>{pct.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
