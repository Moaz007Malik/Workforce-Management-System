import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { CapacityForecastCard } from '@/components/resources/CapacityForecast'
import { useEmployeeStore } from '@/stores/useEmployeeStore'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { cn } from '@/lib/utils'

export function Resources() {
  const navigate = useNavigate()
  const { employees, loading, fetchEmployees, getCapacityForecast } = useEmployeeStore()
  const { metrics, fetchMetrics } = useDashboardStore()

  useEffect(() => {
    fetchEmployees()
    fetchMetrics()
  }, [fetchEmployees, fetchMetrics])

  if (loading) {
    return <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
  }

  const utilization = metrics?.resourceUtilization || []

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Resource Planning</h1>
        <p className="text-muted-foreground">Live capacity planning and utilization from assigned tasks</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="glass">
          <CardContent className="flex items-center gap-4 p-5">
            <Users className="h-8 w-8 text-primary" />
            <div><p className="text-xl font-bold sm:text-2xl">{employees.length}</p><p className="text-sm text-muted-foreground">Total Resources</p></div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="flex items-center gap-4 p-5">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div><p className="text-xl font-bold sm:text-2xl">{utilization.filter((u) => u.utilization > 90).length}</p><p className="text-sm text-muted-foreground">Near Capacity (&gt;90%)</p></div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="flex items-center gap-4 p-5">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div><p className="text-xl font-bold sm:text-2xl">{utilization.filter((u) => u.utilization > 100).length}</p><p className="text-sm text-muted-foreground">Overallocated</p></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Utilization Overview</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {utilization.map((u) => (
            <div
              key={u.id}
              className="flex cursor-pointer items-center gap-4 rounded-lg p-2 transition-colors hover:bg-muted/40"
              onClick={() => navigate(`/hr/${u.id}`)}
            >
              <div className="w-32">
                <p className="text-sm font-medium">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.department}</p>
              </div>
              <div className="flex-1">
                <Progress value={u.allocatedHours} max={u.capacityHours} showLabel color={u.utilization > 100 ? 'danger' : u.utilization > 90 ? 'warning' : 'success'} />
              </div>
              <span className={cn('w-12 text-right text-sm font-semibold', u.utilization > 90 ? 'text-amber-600' : '')}>{u.utilization}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Weekly Capacity Forecast</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {employees.filter((e) => e.status !== 'On Leave').map((emp) => (
            <CapacityForecastCard key={emp.id} employeeId={emp.id} employeeName={emp.fullName} fetchForecast={getCapacityForecast} />
          ))}
        </div>
      </div>
    </div>
  )
}
