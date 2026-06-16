import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, Building2, DollarSign, Target, ListTodo } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectFormDialog } from '@/components/forms/ProjectFormDialog'
import { useProjectStore } from '@/stores/useProjectStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useEmployeeStore } from '@/stores/useEmployeeStore'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { useEffectiveRoles } from '@/lib/useEffectiveRoles'
import { isEmployeeRole } from '@/lib/roles'
import { cn, formatCurrency, getStatusColor, getPriorityColor } from '@/lib/utils'
import type { Project } from '@/types'

const statusAccent: Record<string, string> = {
  Active: 'from-emerald-500 to-teal-400',
  Planned: 'from-violet-500 to-purple-400',
  Completed: 'from-blue-500 to-cyan-400',
  'On Hold': 'from-amber-500 to-orange-400',
  Draft: 'from-slate-400 to-slate-500',
  Cancelled: 'from-red-500 to-rose-400',
}

export function Projects() {
  const navigate = useNavigate()
  const { projects, loading, fetchProjects, deleteProject } = useProjectStore()
  const { tasks, fetchTasks } = useTaskStore()
  const { employees, fetchEmployees } = useEmployeeStore()
  const { metrics, fetchMetrics } = useDashboardStore()
  const { systemRole, currentUserId } = useEffectiveRoles()
  const isEmployee = isEmployeeRole(systemRole)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)

  useEffect(() => {
    fetchProjects()
    fetchTasks()
    if (!isEmployee) {
      fetchEmployees()
      fetchMetrics()
    }
  }, [fetchProjects, fetchTasks, fetchEmployees, fetchMetrics, isEmployee])

  const myProjectIds = useMemo(() => {
    if (!isEmployee || !currentUserId) return null
    return new Set(tasks.filter((t) => t.assigneeId === currentUserId).map((t) => t.projectId))
  }, [tasks, isEmployee, currentUserId])

  const scopedProjects = useMemo(() => {
    if (!myProjectIds) return projects
    return projects.filter((p) => myProjectIds.has(p.id))
  }, [projects, myProjectIds])

  const filtered = scopedProjects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleDelete = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation()
    if (confirm(`Delete project "${project.name}" and all related data?`)) {
      await deleteProject(project.id)
      fetchTasks()
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{isEmployee ? 'My Projects' : 'Projects'}</h1>
          <p className="text-muted-foreground">
            {isEmployee ? 'Projects you are assigned to via tasks' : 'Manage and track all project portfolios'}
          </p>
        </div>
        {!isEmployee && (
          <Button onClick={() => { setEditProject(null); setFormOpen(true) }}>
            <Plus className="h-4 w-4" /> New Project
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {['all', 'Active', 'Planned', 'Completed'].map((s) => (
            <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : s}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <p className="col-span-full rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            {isEmployee ? 'You are not assigned to any projects yet.' : 'No projects match your filters.'}
          </p>
        )}
        {filtered.map((project) => {
          const projectTasks = tasks.filter((t) => t.projectId === project.id)
          const myTasks = isEmployee && currentUserId
            ? projectTasks.filter((t) => t.assigneeId === currentUserId)
            : projectTasks
          const completed = myTasks.filter((t) => t.status === 'Completed').length
          const taskProgress = myTasks.length ? Math.round((completed / myTasks.length) * 100) : 0
          const financials = metrics?.projectProfitability.find((p) => p.projectId === project.id)
          const actualCost = financials?.actualCost ?? 0
          const barColor = financials?.health === 'red' ? 'danger' : financials?.health === 'yellow' ? 'warning' : 'success'

          const accent = statusAccent[project.status] || 'from-primary to-violet-400'

          return (
            <Card
              key={project.id}
              className="group cursor-pointer overflow-hidden border-border/60 bg-card/90 shadow-sm"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className={cn('h-1.5 bg-gradient-to-r', accent)} />
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <span className="inline-block rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide text-muted-foreground">
                      {project.projectId}
                    </span>
                    <h3 className="truncate text-lg font-semibold leading-tight">{project.name}</h3>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{project.client}</span>
                    </p>
                  </div>
                  {!isEmployee && (
                  <div
                    className="flex shrink-0 gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon" className="action-icon-btn" onClick={() => { setEditProject(project); setFormOpen(true) }}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon" className="action-icon-btn text-destructive hover:text-destructive" onClick={(e) => handleDelete(e, project)}>
                      <Trash2 />
                    </Button>
                  </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium', getStatusColor(project.status))}>
                    {project.status}
                  </span>
                  <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium', getPriorityColor(project.priority))}>
                    {project.priority}
                  </span>
                  <Badge variant="secondary" className="gap-1 text-[11px] font-normal">
                    <ListTodo className="h-3 w-3" />
                    {isEmployee ? `${myTasks.length} my tasks` : `${projectTasks.length} tasks`}
                  </Badge>
                </div>

                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-3.5">
                  {!isEmployee && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <DollarSign className="h-3.5 w-3.5" />
                        </span>
                        Budget
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{formatCurrency(project.budget)}</span>
                    </div>
                    <Progress value={actualCost} max={project.budget || 1} color={barColor} className="flex-1" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{formatCurrency(actualCost)}</span> spent · {financials?.consumption ?? 0}% of budget
                    </p>
                  </div>
                  )}

                  {!isEmployee && <div className="h-px bg-border/60" />}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Target className="h-3.5 w-3.5" />
                        </span>
                        {isEmployee ? 'My Task Progress' : 'Project Completion'}
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-primary">{taskProgress}%</span>
                    </div>
                    <Progress value={taskProgress} max={100} color={taskProgress === 100 ? 'success' : 'default'} className="flex-1" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{completed}</span> of {myTasks.length} tasks completed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {!isEmployee && (
      <ProjectFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => fetchProjects()}
        project={editProject}
        employees={employees}
      />
      )}
    </div>
  )
}
