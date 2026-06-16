import { cn } from '@/lib/utils'

export function ChargingIndicator({ total }: { total: number }) {
  const ok = total === 100
  return (
    <span className={cn('text-sm font-medium', ok ? 'text-emerald-600' : 'text-primary')}>
      Charging: {total}% {ok ? '✓' : '(must equal 100%)'}
    </span>
  )
}
