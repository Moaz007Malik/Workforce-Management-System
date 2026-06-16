import { cn } from '@/lib/utils'
import { useThemeColors } from '@/lib/useThemeColors'

interface SlaTimerProps {
  hoursRemaining: number
  totalHours?: number
  className?: string
}

export function SlaTimer({ hoursRemaining, totalHours = 48, className }: SlaTimerProps) {
  const { primary, accent } = useThemeColors()
  const pct = Math.max(0, Math.min(100, (hoursRemaining / totalHours) * 100))
  const urgent = hoursRemaining <= 12
  const warning = hoursRemaining <= totalHours * 0.25 && !urgent
  const color = urgent ? primary : warning ? 'hsl(var(--warning))' : accent

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="relative h-14 w-14 shrink-0">
        <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${pct} 100`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
          {hoursRemaining}h
        </span>
      </div>
      <div className="text-sm">
        <p className={cn('font-medium', urgent && 'text-primary')}>
          {urgent ? 'SLA overdue risk' : warning ? 'SLA reminder (75%+ consumed)' : 'SLA remaining'}
        </p>
        <p className="text-xs text-muted-foreground">{hoursRemaining}h of {totalHours}h window</p>
      </div>
    </div>
  )
}
