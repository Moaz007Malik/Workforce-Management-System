import { useEffect, useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Bug, Plus, Pencil, Trash2, FilePlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { WBSTree, type WBSNode } from '@/components/projects/WBSTree'
import { ProjectFormDialog } from '@/components/forms/ProjectFormDialog'
import { TaskFormDialog } from '@/components/forms/TaskFormDialog'
import { RiskIssueFormDialog } from '@/components/forms/RiskIssueFormDialog'
import { EntityDocumentsCard } from '@/components/documents/EntityDocumentsCard'
import { ProjectPcpsCard } from '@/components/pcp/ProjectPcpsCard'
import { api } from '@/lib/api'
import { useAppStore } from '@/stores/useAppStore'
import { canCreatePcp } from '@/lib/roles'
import { useEmployeeStore } from '@/stores/useEmployeeStore'
import { useProjectStore } from '@/stores/useProjectStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { cn, formatCurrency, getStatusColor } from '@/lib/utils'
import type { Risk, Issue, Employee, Project, PcpRequest } from '@/types'

interface ProjectDetails {
  project: Project
  tasks: unknown[]
  assignedResources: Employee[]
  wbs: WBSNode[]
  risks: Risk[]
  issues: Issue[]
  budget: { budget: number; plannedCost: number; actualCost: number; remaining: number; health: { status: string; consumption: number }; profitability: { profit: number; margin: number } }
  progress: number
  pcps: PcpRequest[]
}

export function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { systemRole, pcpRole } = useAppStore()
  const { employees, fetchEmployees } = useEmployeeStore()
  const showCreatePcp = canCreatePcp(systemRole, pcpRole)
  const { projects, fetchProjects, deleteProject } = useProjectStore()
  const { fetchTasks } = useTaskStore()
  const [data, setData] = useState<ProjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [riskOpen, setRiskOpen] = useState(false)
  const [issueOpen, setIssueOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const d = await api.get<ProjectDetails>(`/projects/${id}/details`)
    setData(d)
    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchEmployees()
    fetchProjects()
    fetchTasks()
    load()
  }, [load, fetchEmployees, fetchProjects, fetchTasks])

  const handleDelete = async () => {
    if (!data || !confirm(`Delete project "${data.project.name}"?`)) return
    await deleteProject(data.project.id)
    navigate('/projects')
  }

  if (loading || !data) return <Skeleton className="h-96" />

  const { project, wbs, risks, issues, budget, assignedResources, progress, pcps = [] } = data
  const healthColors = { green: 'text-emerald-600', yellow: 'text-amber-600', red: 'text-red-600' }

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold sm:text-2xl">{project.name}</h1>
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', getStatusColor(project.status))}>{project.status}</span>
          </div>
          <p className="text-muted-foreground">{project.client} · PM: {project.projectManager} · {progress}% complete</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showCreatePcp && (
            <Link to={`/pcp/new?projectId=${project.id}`}>
              <Button className="bg-primary hover:bg-primary/90"><FilePlus className="h-4 w-4" /> Create PCP</Button>
            </Link>
          )}
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
          <Button variant="outline" onClick={() => setTaskOpen(true)}><Plus className="h-4 w-4" /> Add Task</Button>
          <Button variant="destructive" onClick={handleDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Budget</p><p className="text-xl font-bold">{formatCurrency(budget.budget)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Actual Cost</p><p className="text-xl font-bold">{formatCurrency(budget.actualCost)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Remaining</p><p className={cn('text-xl font-bold', healthColors[budget.health.status as keyof typeof healthColors])}>{formatCurrency(budget.remaining)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Profit Margin</p><p className="text-xl font-bold text-emerald-600">{budget.profitability.margin}%</p></CardContent></Card>
      </div>

      {assignedResources.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Assigned Resources</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {assignedResources.map((e) => (
              <Badge key={e.id} variant="secondary">{e.fullName} · {e.utilization ?? 0}%</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Work Breakdown Structure</CardTitle></CardHeader>
            <CardContent><WBSTree nodes={wbs} /></CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /><CardTitle className="text-base">Risks</CardTitle></div>
              <Button size="sm" variant="ghost" onClick={() => setRiskOpen(true)}><Plus className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {risks.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-2 text-sm">
                  <p className="font-medium">{r.risk}</p>
                  <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                    <span>P: {r.probability}</span><span>I: {r.impact}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">{r.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2"><Bug className="h-4 w-4 text-red-500" /><CardTitle className="text-base">Issues</CardTitle></div>
              <Button size="sm" variant="ghost" onClick={() => setIssueOpen(true)}><Plus className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {issues.map((i) => (
                <div key={i.id} className="rounded-lg border border-border p-2 text-sm">
                  <p className="font-medium">{i.issue}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">{i.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <EntityDocumentsCard entityType="project" entityId={project.id} />

          <ProjectPcpsCard projectId={project.id} projectName={project.name} pcps={pcps} canCreate={showCreatePcp} />
        </div>
      </div>

      <ProjectFormDialog open={editOpen} onClose={() => setEditOpen(false)} onSaved={load} project={project} employees={employees} />
      <TaskFormDialog open={taskOpen} onClose={() => setTaskOpen(false)} onSaved={() => { load(); fetchTasks() }} projects={projects} employees={employees} defaultProjectId={project.id} />
      <RiskIssueFormDialog open={riskOpen} onClose={() => setRiskOpen(false)} onSaved={load} type="risk" projectId={project.id} employees={employees} />
      <RiskIssueFormDialog open={issueOpen} onClose={() => setIssueOpen(false)} onSaved={load} type="issue" projectId={project.id} employees={employees} />
    </div>
  )
}
