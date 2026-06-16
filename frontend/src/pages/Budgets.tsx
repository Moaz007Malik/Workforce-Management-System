import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectFormDialog } from '@/components/forms/ProjectFormDialog'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useEmployeeStore } from '@/stores/useEmployeeStore'
import { cn, formatCurrency } from '@/lib/utils'
import type { Project } from '@/types'

export function Budgets() {
  const { metrics, loading, fetchMetrics } = useDashboardStore()
  const { projects, fetchProjects } = useProjectStore()
  const { employees, fetchEmployees } = useEmployeeStore()
  const [editProject, setEditProject] = useState<Project | null>(null)

  useEffect(() => {
    fetchMetrics()
    fetchProjects()
    fetchEmployees()
  }, [fetchMetrics, fetchProjects, fetchEmployees])

  if (loading || !metrics) return <Skeleton className="h-96" />

  const healthIcons = { green: '🟢', yellow: '🟡', red: '🔴' }

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Budget Management</h1>
        <p className="text-muted-foreground">Live planned vs actual costs calculated from tasks and approved timesheets</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Total Budget</p><p className="text-xl font-bold sm:text-2xl">{formatCurrency(metrics.kpis.totalBudget)}</p></CardContent></Card>
        <Card className="glass"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Planned Cost</p><p className="text-xl font-bold sm:text-2xl">{formatCurrency(metrics.kpis.totalPlannedCost)}</p></CardContent></Card>
        <Card className="glass"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Actual Cost</p><p className="text-xl font-bold sm:text-2xl">{formatCurrency(metrics.kpis.totalActualCost)}</p></CardContent></Card>
        <Card className="glass"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Utilization</p><p className="text-xl font-bold sm:text-2xl">{metrics.kpis.budgetUtilization}%</p></CardContent></Card>
      </div>

      <div className="space-y-4">
        {metrics.projectProfitability.map((p) => {
          const project = projects.find((pr) => pr.id === p.projectId)
          const barColor = p.health === 'red' ? 'danger' : p.health === 'yellow' ? 'warning' : 'success'
          return (
            <Card key={p.projectId}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{p.projectName}</h3>
                    <p className="text-sm text-muted-foreground">{project?.client}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{healthIcons[p.health as keyof typeof healthIcons]}</span>
                    <span className="text-xs text-muted-foreground">{p.consumption}% consumed</span>
                    {project && (
                      <Button variant="ghost" size="icon" className="action-icon-btn" onClick={() => setEditProject(project)}>
                        <Pencil />
                      </Button>
                    )}
                  </div>
                </div>
                <Progress value={p.actualCost} max={p.budget} showLabel color={barColor} />
                <div className="grid grid-cols-2 gap-3 text-center text-sm sm:grid-cols-4 sm:gap-4">
                  <div><p className="text-muted-foreground">Budget</p><p className="font-semibold">{formatCurrency(p.budget)}</p></div>
                  <div><p className="text-muted-foreground">Planned</p><p className="font-semibold">{formatCurrency(p.plannedCost)}</p></div>
                  <div><p className="text-muted-foreground">Actual</p><p className="font-semibold">{formatCurrency(p.actualCost)}</p></div>
                  <div><p className="text-muted-foreground">Remaining</p><p className={cn('font-semibold', p.remaining < 0 ? 'text-red-500' : 'text-emerald-600')}>{formatCurrency(p.remaining)}</p></div>
                </div>
                <div className="flex justify-between border-t border-border pt-3 text-sm">
                  <span>Revenue: <strong>{formatCurrency(p.revenue)}</strong></span>
                  <span>Profit: <strong className="text-emerald-600">{formatCurrency(p.profit)}</strong> ({p.margin}%)</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <ProjectFormDialog
        open={!!editProject}
        onClose={() => setEditProject(null)}
        onSaved={() => { fetchMetrics(); fetchProjects() }}
        project={editProject}
        employees={employees}
      />
    </div>
  )
}
