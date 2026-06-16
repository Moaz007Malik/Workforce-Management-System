import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Briefcase, DollarSign, Pencil, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { CapacityForecastCard } from '@/components/resources/CapacityForecast'
import { EmployeeFormDialog } from '@/components/forms/EmployeeFormDialog'
import { LeaveFormDialog } from '@/components/forms/LeaveFormDialog'
import { EntityDocumentsCard } from '@/components/documents/EntityDocumentsCard'
import { api } from '@/lib/api'
import { useEmployeeStore } from '@/stores/useEmployeeStore'
import { cn, formatCurrency, getStatusColor, getPriorityColor } from '@/lib/utils'
import type { Employee, Task, Project, Timesheet, Leave, Attendance } from '@/types'

interface ProfileData {
  employee: Employee
  assignedProjects: Project[]
  assignedTasks: Task[]
  timesheets: Timesheet[]
  leaves: Leave[]
  attendance?: Attendance[]
  allocatedHours: number
  utilization: number
}

export function EmployeeProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getCapacityForecast, fetchEmployees } = useEmployeeStore()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [taskFilter, setTaskFilter] = useState('all')

  const load = useCallback(async () => {
    if (!id) return
    const d = await api.get<ProfileData>(`/employees/${id}/profile`)
    setData(d)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const assignedProjects = data?.assignedProjects ?? []
  const assignedTasks = data?.assignedTasks ?? []

  const projectMap = useMemo(
    () => Object.fromEntries(assignedProjects.map((p) => [p.id, p.name])),
    [assignedProjects]
  )

  const filteredTasks = useMemo(() => {
    if (taskFilter === 'all') return assignedTasks
    if (taskFilter === 'active') return assignedTasks.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled')
    return assignedTasks.filter((t) => t.status === taskFilter)
  }, [assignedTasks, taskFilter])

  if (loading || !data) return <Skeleton className="h-96" />

  const { employee, timesheets, leaves, attendance = [], allocatedHours, utilization } = data

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/hr')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex flex-1 items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold sm:text-2xl text-primary">
            {employee.fullName.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{employee.fullName}</h1>
            <p className="text-muted-foreground">{employee.designation} · {employee.department}</p>
          </div>
          <span className={cn('rounded-full px-3 py-1 text-xs font-medium', getStatusColor(employee.status))}>{employee.status}</span>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
        <Button variant="outline" onClick={() => setLeaveOpen(true)}>Request Leave</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card><CardContent className="flex items-center gap-3 p-4"><Mail className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm">{employee.email}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4"><DollarSign className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Hourly Rate</p><p className="text-sm font-semibold">{formatCurrency(employee.hourlyRate)}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4"><Briefcase className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Capacity</p><p className="text-sm font-semibold">{employee.capacityHours}h/week</p></div></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Skills</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 pt-0">
              {employee.skills?.length ? employee.skills.map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              )) : (
                <p className="text-sm text-muted-foreground">No skills listed</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Assigned Tasks ({assignedTasks.length})</CardTitle>
                <div className="flex gap-1">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'active', label: 'Active' },
                    { key: 'Completed', label: 'Done' },
                  ].map((f) => (
                    <Button
                      key={f.key}
                      size="sm"
                      variant={taskFilter === f.key ? 'default' : 'outline'}
                      className="h-7 text-xs"
                      onClick={() => setTaskFilter(f.key)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No tasks assigned to this employee yet.</p>
              ) : (
                filteredTasks.map((t) => (
                  <div key={t.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{projectMap[t.projectId] || 'Unknown project'}</p>
                      </div>
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', getPriorityColor(t.priority))}>{t.priority}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{t.status}</Badge>
                      <Badge variant="outline">{t.kanbanStatus}</Badge>
                      <span className="text-xs text-muted-foreground">{t.actualHours}/{t.estimatedHours}h</span>
                      {t.dueDate && <span className="text-xs text-muted-foreground">Due {t.dueDate}</span>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Timesheets ({timesheets.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-48 overflow-y-auto">
              {timesheets.slice(0, 10).map((ts) => (
                <div key={ts.id} className="flex justify-between rounded-lg border border-border p-2 text-sm">
                  <span>{ts.date}</span>
                  <span>{ts.hoursWorked}h</span>
                  <Badge variant="outline">{ts.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Assigned Projects ({assignedProjects.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {assignedProjects.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/projects/${p.id}`)}>
                  <div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{p.client}</p></div>
                  <Badge variant="outline">{p.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Utilization</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <p className="text-3xl font-bold">{utilization}%</p>
                <p className="text-sm text-muted-foreground">{allocatedHours}h allocated / {employee.capacityHours}h capacity</p>
              </div>
              <Progress value={allocatedHours} max={employee.capacityHours} color={utilization > 90 ? 'warning' : 'success'} />
            </CardContent>
          </Card>

          <CapacityForecastCard employeeId={employee.id} employeeName={employee.fullName} fetchForecast={getCapacityForecast} />

          <EntityDocumentsCard entityType="employee" entityId={employee.id} />

          {attendance.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Recent Attendance</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {attendance.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-sm">
                    <div>
                      <p className="font-medium">{a.date}</p>
                      <p className="text-xs text-muted-foreground">
                        {[a.checkIn, a.checkOut].filter(Boolean).join(' – ') || 'No check-in'}
                        {a.location ? ` · ${a.location}` : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px]', getStatusColor(a.status))}>{a.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {leaves.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Leave History</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {leaves.map((l) => (
                  <div key={l.id} className="rounded-lg border border-border p-2 text-sm">
                    <p className="font-medium">{l.type}</p>
                    <p className="text-xs text-muted-foreground">{l.startDate} → {l.endDate}</p>
                    <Badge variant="outline" className="mt-1 text-[10px]">{l.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <EmployeeFormDialog open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => { load(); fetchEmployees() }} employee={employee} />
      <LeaveFormDialog open={leaveOpen} onClose={() => setLeaveOpen(false)} onSaved={load} employees={[employee]} />
    </div>
  )
}
