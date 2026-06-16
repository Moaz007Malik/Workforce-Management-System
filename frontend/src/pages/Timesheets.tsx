import { useEffect, useMemo, useState } from 'react'
import { Check, X, Clock, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TimesheetFormDialog } from '@/components/forms/TimesheetFormDialog'
import { api } from '@/lib/api'
import { useEmployeeStore } from '@/stores/useEmployeeStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { useEffectiveRoles } from '@/lib/useEffectiveRoles'
import { canManageEmployees, isEmployeeRole } from '@/lib/roles'
import { cn, getStatusColor } from '@/lib/utils'
import type { Timesheet } from '@/types'

export function Timesheets() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const { systemRole, currentUserId } = useEffectiveRoles()
  const isEmployee = isEmployeeRole(systemRole)
  const canApprove = canManageEmployees(systemRole)
  const { employees, fetchEmployees } = useEmployeeStore()
  const { projects, fetchProjects } = useProjectStore()
  const { tasks, fetchTasks } = useTaskStore()
  const { fetchMetrics } = useDashboardStore()

  const load = async () => {
    const ts = await api.get<Timesheet[]>('/timesheets')
    setTimesheets(ts.sort((a, b) => b.date.localeCompare(a.date)))
    setLoading(false)
  }

  useEffect(() => {
    Promise.all([
      load(),
      fetchProjects(),
      fetchTasks(),
      ...(isEmployee ? [] : [fetchEmployees(), fetchMetrics()]),
    ])
  }, [fetchEmployees, fetchProjects, fetchTasks, fetchMetrics, isEmployee])

  const scopedTimesheets = useMemo(() => {
    if (!isEmployee || !currentUserId) return timesheets
    return timesheets.filter((t) => t.employeeId === currentUserId)
  }, [timesheets, isEmployee, currentUserId])

  const handleApproval = async (id: string, status: 'Approved' | 'Rejected') => {
    setActionId(id)
    try {
      const updated = await api.put<Timesheet>(`/timesheets/${id}`, { status })
      setTimesheets((prev) => prev.map((t) => (t.id === id ? updated : t)))
      await fetchTasks()
      await fetchMetrics()
    } finally {
      setActionId(null)
    }
  }

  const filtered = filter === 'all' ? scopedTimesheets : scopedTimesheets.filter((t) => t.status === filter)
  const pending = scopedTimesheets.filter((t) => t.status === 'Pending').length

  if (loading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{isEmployee ? 'My Timesheets' : 'Timesheets'}</h1>
          <p className="text-muted-foreground">{pending} pending · {scopedTimesheets.length} total entries</p>
        </div>
        <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> Log Time</Button>
      </div>

      <div className="flex gap-2">
        {['all', 'Pending', 'Approved', 'Rejected'].map((f) => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Time Entries</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  {!isEmployee && <th className="pb-3 pr-4 font-medium">Employee</th>}
                  <th className="pb-3 pr-4 font-medium">Project</th>
                  <th className="pb-3 pr-4 font-medium">Hours</th>
                  <th className="pb-3 pr-4 font-medium">Notes</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  {canApprove && <th className="pb-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ts) => {
                  const emp = employees.find((e) => e.id === ts.employeeId)
                  const proj = projects.find((p) => p.id === ts.projectId)
                  return (
                    <tr key={ts.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 pr-4">{ts.date}</td>
                      {!isEmployee && <td className="py-3 pr-4 font-medium">{emp?.fullName || '—'}</td>}
                      <td className="py-3 pr-4">{proj?.name || '—'}</td>
                      <td className="py-3 pr-4"><div className="flex items-center gap-1"><Clock className="h-3 w-3" />{ts.hoursWorked}h</div></td>
                      <td className="py-3 pr-4 text-muted-foreground max-w-[200px] truncate">{ts.notes}</td>
                      <td className="py-3 pr-4"><span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', getStatusColor(ts.status))}>{ts.status}</span></td>
                      {canApprove && (
                      <td className="py-3">
                        {ts.status === 'Pending' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="action-icon-btn text-emerald-600" disabled={actionId === ts.id} onClick={() => handleApproval(ts.id, 'Approved')}>
                              <Check />
                            </Button>
                            <Button size="sm" variant="ghost" className="action-icon-btn text-red-500" disabled={actionId === ts.id} onClick={() => handleApproval(ts.id, 'Rejected')}>
                              <X />
                            </Button>
                          </div>
                        )}
                      </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <TimesheetFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => load()}
        projects={projects}
        employees={isEmployee ? [] : employees}
        tasks={tasks}
        defaultEmployeeId={isEmployee ? currentUserId : undefined}
      />
    </div>
  )
}
