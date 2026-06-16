import { Link } from 'react-router-dom'
import { CheckSquare, FolderKanban, Briefcase, Clock, ClipboardCheck } from 'lucide-react'
import { KPICard } from '@/components/dashboard/KPICard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, getPriorityColor, getStatusColor } from '@/lib/utils'
import type { Project, Task, Attendance, Timesheet } from '@/types'

interface EmployeeDashboardProps {
  assignedProjects: Project[]
  assignedTasks: Task[]
  timesheets: Timesheet[]
  attendance?: Attendance[]
  utilization: number
  allocatedHours: number
  capacityHours: number
  projectMap: Record<string, string>
}

export function EmployeeDashboard({
  assignedProjects,
  assignedTasks,
  timesheets,
  attendance = [],
  utilization,
  allocatedHours,
  capacityHours,
  projectMap,
}: EmployeeDashboardProps) {
  const activeTasks = assignedTasks.filter(
    (t) => t.status !== 'Completed' && t.status !== 'Cancelled',
  )
  const completedTasks = assignedTasks.filter((t) => t.status === 'Completed')
  const pendingTimesheets = timesheets.filter((t) => t.status === 'Pending').length
  const recentAttendance = attendance.slice(0, 5)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <KPICard
          title="My Active Tasks"
          value={activeTasks.length}
          icon={CheckSquare}
          subtitle={`${completedTasks.length} completed`}
        />
        <KPICard
          title="My Projects"
          value={assignedProjects.length}
          icon={FolderKanban}
          subtitle={assignedProjects.map((p) => p.status).filter((s) => s === 'Active').length
            ? `${assignedProjects.filter((p) => p.status === 'Active').length} active`
            : 'Assigned via tasks'}
        />
        <KPICard
          title="Utilization"
          value={`${Math.round(utilization)}%`}
          icon={Briefcase}
          subtitle={`${allocatedHours}h allocated · ${capacityHours}h capacity`}
        />
        <KPICard
          title="Timesheets"
          value={timesheets.length}
          icon={Clock}
          subtitle={pendingTimesheets ? `${pendingTimesheets} pending approval` : 'All submitted'}
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Tasks</CardTitle>
            <Link to="/tasks"><Button variant="outline" size="sm">View all</Button></Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active tasks assigned to you.</p>
            ) : (
              activeTasks.slice(0, 6).map((t) => (
                <div key={t.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{projectMap[t.projectId] || 'Project'}</p>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', getPriorityColor(t.priority))}>
                      {t.priority}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{t.kanbanStatus}</Badge>
                    <span className="text-xs text-muted-foreground">{t.actualHours}/{t.estimatedHours}h</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Projects</CardTitle>
            <Link to="/projects"><Button variant="outline" size="sm">View all</Button></Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignedProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">You are not assigned to any projects yet.</p>
            ) : (
              assignedProjects.map((p) => (
                <Link
                  key={p.id}
                  to={`/projects/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.client}</p>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', getStatusColor(p.status))}>
                    {p.status}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {recentAttendance.length > 0 && (
          <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Attendance</CardTitle>
              <Link to="/attendance"><Button variant="outline" size="sm"><ClipboardCheck className="h-3.5 w-3.5" /> Open</Button></Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentAttendance.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{a.date}</span>
                  <Badge variant="outline">{a.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
