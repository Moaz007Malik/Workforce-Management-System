import { useEffect, useState } from 'react'
import {
  FolderKanban, Users, DollarSign, TrendingUp, Wallet, Download,
  CheckSquare, AlertTriangle, UserCheck,
} from 'lucide-react'
import { DashboardExportDialog } from '@/components/dashboard/DashboardExportDialog'
import { EmployeeDashboard } from '@/components/dashboard/EmployeeDashboard'
import { KPICard } from '@/components/dashboard/KPICard'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { DashboardWorkforceCharts } from '@/components/dashboard/DashboardWorkforceCharts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { useEffectiveRoles } from '@/lib/useEffectiveRoles'
import { canViewOrgFinancials, isEmployeeRole } from '@/lib/roles'
import { api } from '@/lib/api'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { Project, Task, Timesheet, Attendance } from '@/types'

interface EmployeeProfileSummary {
  assignedProjects: Project[]
  assignedTasks: Task[]
  timesheets: Timesheet[]
  attendance?: Attendance[]
  allocatedHours: number
  utilization: number
  employee: { capacityHours: number }
}

export function Dashboard() {
  const { metrics, loading, fetchMetrics } = useDashboardStore()
  const { systemRole, pcpRole, currentUserId } = useEffectiveRoles()
  const showFinancials = canViewOrgFinancials(systemRole, pcpRole)
  const isHr = systemRole === 'HR'
  const isEmployee = isEmployeeRole(systemRole)
  const [exportOpen, setExportOpen] = useState(false)
  const [employeeData, setEmployeeData] = useState<EmployeeProfileSummary | null>(null)
  const [employeeLoading, setEmployeeLoading] = useState(false)

  useEffect(() => {
    if (!isEmployee || !currentUserId) return
    setEmployeeLoading(true)
    api.get<EmployeeProfileSummary>(`/employees/${currentUserId}/profile`)
      .then(setEmployeeData)
      .catch(() => setEmployeeData(null))
      .finally(() => setEmployeeLoading(false))
  }, [isEmployee, currentUserId])

  useEffect(() => {
    if (isEmployee) return
    fetchMetrics()
  }, [fetchMetrics, isEmployee])

  if (isEmployee) {
    if (employeeLoading || !employeeData) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      )
    }

    const projectMap = Object.fromEntries(employeeData.assignedProjects.map((p) => [p.id, p.name]))

    return (
      <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">My Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your tasks, projects, and workload</p>
        </div>
        <EmployeeDashboard
          assignedProjects={employeeData.assignedProjects}
          assignedTasks={employeeData.assignedTasks}
          timesheets={employeeData.timesheets}
          attendance={employeeData.attendance}
          utilization={employeeData.utilization}
          allocatedHours={employeeData.allocatedHours}
          capacityHours={employeeData.employee.capacityHours}
          projectMap={projectMap}
        />
      </div>
    )
  }

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    )
  }

  const { kpis } = metrics
  const totalTasks = kpis.totalTasks ?? metrics.taskProgress.reduce((s, t) => s + t.count, 0)
  const completedTasks = kpis.completedTasks ?? metrics.taskProgress.find((t) => t.status === 'Completed')?.count ?? 0
  const inProgressTasks = kpis.inProgressTasks ?? metrics.taskProgress.find((t) => t.status === 'In Progress')?.count ?? 0
  const blockedTasks = kpis.blockedTasks ?? metrics.taskProgress.find((t) => t.status === 'Blocked')?.count ?? 0

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground break-words">
            {isHr ? 'Workforce overview — people, tasks, and utilization' : 'Projects, workforce, tasks, and budgets'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <DashboardExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        metrics={metrics}
        pdfOptions={{
          scopeLabel: isHr ? 'HR — organization' : 'Organization',
        }}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {!isHr && (
          <KPICard
            title="Active Projects"
            value={kpis.activeProjects}
            icon={FolderKanban}
            trend={kpis.projectGrowthTrend}
            subtitle={`${kpis.totalProjects} total · ${kpis.completedProjects} completed`}
          />
        )}
        <KPICard
          title="Employees"
          value={kpis.totalEmployees}
          icon={Users}
          subtitle={`${kpis.availableResources} available · ${kpis.allocatedResources} allocated`}
        />
        <KPICard
          title="Total Tasks"
          value={totalTasks}
          icon={CheckSquare}
          subtitle={`${completedTasks} completed · ${inProgressTasks} in progress`}
        />
        <KPICard
          title="In Progress"
          value={inProgressTasks}
          icon={UserCheck}
          subtitle={`${blockedTasks} blocked`}
        />
        {!isHr && showFinancials && (
          <>
            <KPICard
              title="Budget Utilization"
              value={formatPercent(kpis.budgetUtilization)}
              icon={Wallet}
              subtitle={`${formatCurrency(kpis.totalActualCost)} of ${formatCurrency(kpis.totalBudget)} spent`}
            />
            <KPICard
              title="Actual Project Cost"
              value={formatCurrency(kpis.totalActualCost)}
              icon={DollarSign}
              trend={kpis.monthlyCostTrend}
              subtitle={`${formatCurrency(kpis.totalPlannedCost)} planned`}
            />
            <KPICard
              title="Revenue"
              value={formatCurrency(kpis.totalRevenue)}
              icon={TrendingUp}
              subtitle={`${formatPercent(kpis.profitMargin)} margin · ${formatCurrency(kpis.profit)} profit`}
            />
          </>
        )}
        {blockedTasks > 0 && (
          <KPICard
            title="Blocked Tasks"
            value={blockedTasks}
            icon={AlertTriangle}
            subtitle="Needs attention"
          />
        )}
      </div>

      <DashboardWorkforceCharts metrics={metrics} showProjects={!isHr} />

      {!isHr && showFinancials && (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
          <DashboardCharts metrics={metrics} />
        </div>
      )}
    </div>
  )
}
