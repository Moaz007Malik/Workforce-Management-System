import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, AlertCircle, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { CapacityForecast as CapacityForecastType } from '@/types'
import { cn } from '@/lib/utils'

interface CapacityForecastProps {
  employeeId: string
  employeeName: string
  fetchForecast: (id: string) => Promise<CapacityForecastType>
  proposedHours?: number
}

export function CapacityForecastCard({ employeeId, employeeName, fetchForecast, proposedHours = 0 }: CapacityForecastProps) {
  const [forecast, setForecast] = useState<CapacityForecastType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchForecast(employeeId).then((data) => {
      setForecast(data)
      setLoading(false)
    })
  }, [employeeId, fetchForecast])

  if (loading || !forecast) {
    return <Card><CardContent className="p-6"><div className="skeleton h-32 rounded-lg" /></CardContent></Card>
  }

  const projectedAllocation = forecast.allocatedHours + proposedHours
  const projectedUtilization = Math.round((projectedAllocation / forecast.capacityHours) * 100)
  const projectedAvailable = Math.max(0, forecast.capacityHours - projectedAllocation)

  const warningIcons = { ok: CheckCircle, warning: AlertTriangle, critical: AlertCircle }
  const warningColors = { ok: 'text-emerald-500', warning: 'text-amber-500', critical: 'text-red-500' }

  const projectedWarning = projectedUtilization > 100 ? 'critical' : projectedUtilization > 90 ? 'warning' : 'ok'
  const WarningIcon = warningIcons[projectedWarning]

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{employeeName}</CardTitle>
          <Badge variant="outline" className="gap-1">
            <Calendar className="h-3 w-3" />
            This Week
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-lg font-bold">{forecast.capacityHours}h</p>
            <p className="text-[10px] text-muted-foreground">Capacity</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-lg font-bold">{forecast.allocatedHours}h</p>
            <p className="text-[10px] text-muted-foreground">Allocated</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-lg font-bold">{forecast.availableHours}h</p>
            <p className="text-[10px] text-muted-foreground">Available</p>
          </div>
        </div>

        <Progress
          value={forecast.allocatedHours}
          max={forecast.capacityHours}
          showLabel
          color={forecast.utilization > 100 ? 'danger' : forecast.utilization > 90 ? 'warning' : 'success'}
        />

        {proposedHours > 0 && (
          <div className={cn('rounded-lg border p-3', projectedWarning === 'critical' ? 'border-red-500/30 bg-red-500/5' : projectedWarning === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5')}>
            <div className="flex items-center gap-2">
              <WarningIcon className={cn('h-4 w-4', warningColors[projectedWarning])} />
              <p className="text-sm font-medium">
                {projectedWarning === 'critical'
                  ? `Warning: Assigning ${proposedHours}h would exceed capacity (${projectedUtilization}%)`
                  : projectedWarning === 'warning'
                  ? `Caution: Near capacity after assignment (${projectedUtilization}%)`
                  : `Safe to assign ${proposedHours}h (${projectedAvailable}h remaining)`}
              </p>
            </div>
          </div>
        )}

        {forecast.assignedTasks.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Assigned Tasks</p>
            <div className="space-y-1">
              {forecast.assignedTasks.slice(0, 4).map((t) => (
                <div key={t.id} className="flex justify-between text-xs">
                  <span className="truncate">{t.title}</span>
                  <span className="text-muted-foreground">{t.hours}h</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
