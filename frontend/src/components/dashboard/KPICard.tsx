import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: number
  subtitle?: string
  className?: string
}

export function KPICard({ title, value, icon: Icon, trend, subtitle, className }: KPICardProps) {
  return (
    <Card className={cn('group overflow-hidden', className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-xl font-bold tracking-tight break-words sm:text-2xl">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground break-words">{subtitle}</p>}
            {trend !== undefined && trend !== 0 && (
              <div className={cn('flex items-center gap-1 text-xs font-medium', trend >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend)}% vs last month
              </div>
            )}
          </div>
          <div className="rounded-xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-muted group-hover:text-foreground">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
