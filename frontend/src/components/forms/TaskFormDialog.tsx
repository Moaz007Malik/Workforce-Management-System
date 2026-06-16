import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { FormField } from './FormField'
import { useEntityCrud } from '@/hooks/useEntityCrud'
import type { Task, Project, Employee } from '@/types'

interface TaskFormDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  task?: Task | null
  projects: Project[]
  employees: Employee[]
  defaultProjectId?: string
}

const emptyForm = {
  title: '',
  description: '',
  projectId: '',
  assigneeId: '',
  priority: 'Medium',
  status: 'Not Started',
  kanbanStatus: 'Backlog',
  estimatedHours: '8',
  dueDate: '',
  requiredSkills: '',
}

export function TaskFormDialog({ open, onClose, onSaved, task, projects, employees, defaultProjectId }: TaskFormDialogProps) {
  const { create, update, loading, error } = useEntityCrud<Task>('/tasks', onSaved)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (!open) return
    setForm(task ? {
      title: task.title,
      description: task.description,
      projectId: task.projectId,
      assigneeId: task.assigneeId || '',
      priority: task.priority,
      status: task.status,
      kanbanStatus: task.kanbanStatus,
      estimatedHours: task.estimatedHours?.toString() || '8',
      dueDate: task.dueDate || '',
      requiredSkills: task.requiredSkills?.join(', ') || '',
    } : { ...emptyForm, projectId: defaultProjectId || '' })
  }, [open, task, defaultProjectId])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      title: form.title,
      description: form.description,
      projectId: form.projectId,
      assigneeId: form.assigneeId || undefined,
      priority: form.priority,
      status: form.status,
      kanbanStatus: form.kanbanStatus,
      estimatedHours: Number(form.estimatedHours) || 0,
      dueDate: form.dueDate,
      requiredSkills: form.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
    }
    if (task) await update(task.id, payload)
    else await create(payload)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={task ? 'Edit Task' : 'Create New Task'}
      description="Define work item, assignee, and estimated effort"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="task-form" disabled={loading}>
            {loading ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Title">
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Build API endpoints" required />
        </FormField>
        <FormField label="Description">
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} className="min-h-[72px] resize-none" />
        </FormField>
        <FormField label="Project">
          <Select value={form.projectId} onChange={(e) => set('projectId', e.target.value)} required>
            <option value="">Select project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Assignee">
          <Select value={form.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}>
            <option value="">Unassigned</option>
            {employees.filter((e) => e.status !== 'On Leave').map((e) => (
              <option key={e.id} value={e.id}>{e.fullName} ({e.utilization ?? 0}% util)</option>
            ))}
          </Select>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Priority">
            <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </FormField>
          <FormField label="Kanban Column">
            <Select value={form.kanbanStatus} onChange={(e) => set('kanbanStatus', e.target.value)}>
              {['Backlog', 'To Do', 'In Progress', 'Review', 'Completed'].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Estimated Hours">
            <Input type="number" min="1" value={form.estimatedHours} onChange={(e) => set('estimatedHours', e.target.value)} required />
          </FormField>
          <FormField label="Due Date">
            <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </FormField>
        </div>
        <FormField label="Required Skills (comma-separated)">
          <Input value={form.requiredSkills} onChange={(e) => set('requiredSkills', e.target.value)} placeholder="React, Node.js" />
        </FormField>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </form>
    </Dialog>
  )
}
