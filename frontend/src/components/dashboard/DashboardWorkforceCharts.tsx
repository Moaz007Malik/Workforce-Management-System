import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DashboardMetrics } from '@/types'
import { cn } from '@/lib/utils'
import { useBreakpoint } from '@/lib/useBreakpoint'

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1']
const TASK_STATUS_COLORS: Record<string, string> = {
  'Not Started': '#94a3b8',
  'In Progress': '#3b82f6',
  Review: '#8b5cf6',
  Blocked: '#ef4444',
  Completed: '#10b981',
}
const EMP_STATUS_COLORS: Record<string, string> = {
  Available: '#10b981',
  Allocated: '#3b82f6',
  'Fully Allocated': '#f59e0b',
  'On Leave': '#94a3b8',
}
const KANBAN_COLORS: Record<string, string> = {
  Backlog: '#94a3b8',
  'To Do': '#6366f1',
  'In Progress': '#3b82f6',
  Review: '#8b5cf6',
  Completed: '#10b981',
}

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
}

interface DashboardWorkforceChartsProps {
  metrics: DashboardMetrics
  showProjects?: boolean
}

export function DashboardWorkforceCharts({ metrics, showProjects = true }: DashboardWorkforceChartsProps) {
  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'

  const kanbanData = Object.entries(metrics.kanbanCounts).map(([stage, count]) => ({ stage, count }))
  const taskData = metrics.taskProgress.filter((d) => d.count > 0)
  const deptData = metrics.employeesByDepartment ?? []
  const statusData = (metrics.employeesByStatus ?? []).filter((d) => d.count > 0)
  const topEmployees = metrics.topEmployees ?? []
  const utilizationData = metrics.resourceUtilization.slice(0, 8)

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Task Status</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="status" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" name="Tasks" radius={[4, 4, 0, 0]}>
                  {taskData.map((entry) => (
                    <Cell key={entry.status} fill={TASK_STATUS_COLORS[entry.status] || COLORS[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Task Pipeline (Kanban)</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kanbanData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" name="Tasks" radius={[4, 4, 0, 0]}>
                  {kanbanData.map((entry) => (
                    <Cell key={entry.stage} fill={KANBAN_COLORS[entry.stage] || COLORS[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base sm:text-lg">Top Employees</CardTitle>
          <Link to="/hr"><Button variant="outline" size="sm">View all</Button></Link>
        </CardHeader>
        <CardContent className="space-y-4">
          {topEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employee utilization data yet.</p>
          ) : (
            topEmployees.map((emp, i) => (
              <div key={emp.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{emp.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{emp.department}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(
                    'shrink-0 tabular-nums',
                    emp.utilization > 100 ? 'text-red-600' : emp.utilization > 90 ? 'text-amber-600' : 'text-emerald-600',
                  )}>
                    {Math.round(emp.utilization)}%
                  </Badge>
                </div>
                <Progress
                  value={Math.min(emp.utilization, 100)}
                  max={100}
                  color={emp.utilization > 100 ? 'danger' : emp.utilization > 90 ? 'warning' : 'success'}
                />
                <p className="text-xs text-muted-foreground">
                  {emp.allocatedHours}h allocated · {emp.capacityHours}h capacity
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Employees by Department</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="department" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={isMobile ? 72 : 100} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" name="Employees" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Employee Availability</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 45 : 55}
                  outerRadius={isMobile ? 72 : 90}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="status"
                  label={isMobile ? false : (props) => `${props.name}: ${props.value}`}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={EMP_STATUS_COLORS[entry.status] || COLORS[0]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                {isMobile && <Legend wrapperStyle={{ fontSize: 11 }} />}
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Resource Utilization</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={utilizationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={isMobile ? 56 : 80} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="utilization" radius={[0, 4, 4, 0]} name="Utilization %">
                  {utilizationData.map((entry) => (
                    <Cell key={entry.id} fill={entry.utilization > 100 ? '#ef4444' : entry.utilization > 90 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {showProjects ? (
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Employee Allocation (Hours)</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.employeeAllocation}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Bar dataKey="allocated" stackId="a" fill="#8b5cf6" name="Allocated" />
                  <Bar dataKey="available" stackId="a" fill="hsl(var(--muted))" name="Available" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Project Status</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.projectStatusDistribution.filter((d) => d.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 45 : 55}
                    outerRadius={isMobile ? 72 : 90}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                    label={isMobile ? false : (props) => `${props.name}: ${props.value}`}
                  >
                    {metrics.projectStatusDistribution.map((entry) => (
                      <Cell key={entry.status} fill={COLORS[metrics.projectStatusDistribution.indexOf(entry) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  {isMobile && <Legend wrapperStyle={{ fontSize: 11 }} />}
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
