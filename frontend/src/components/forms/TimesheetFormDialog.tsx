import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { FormField } from './FormField'
import { useEntityCrud } from '@/hooks/useEntityCrud'
import type { Timesheet, Project, Employee, Task } from '@/types'

interface TimesheetFormDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  projects: Project[]
  employees: Employee[]
  tasks: Task[]
  defaultEmployeeId?: string
}

export function TimesheetFormDialog({ open, onClose, onSaved, projects, employees, tasks, defaultEmployeeId }: TimesheetFormDialogProps) {
  const { create, loading, error } = useEntityCrud<Timesheet>('/timesheets', onSaved)
  const [form, setForm] = useState({
    employeeId: '',
    projectId: '',
    taskId: '',
    date: new Date().toISOString().split('T')[0],
    hoursWorked: '8',
    notes: '',
    status: 'Pending' as const,
  })

  useEffect(() => {
    if (!open) return
    setForm({
      employeeId: defaultEmployeeId || '',
      projectId: '',
      taskId: '',
      date: new Date().toISOString().split('T')[0],
      hoursWorked: '8',
      notes: '',
      status: 'Pending',
    })
  }, [open, defaultEmployeeId])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))
  const projectTasks = tasks.filter((t) => t.projectId === form.projectId && (!form.employeeId || t.assigneeId === form.employeeId))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await create({
      employeeId: form.employeeId,
      projectId: form.projectId,
      taskId: form.taskId,
      date: form.date,
      hoursWorked: Number(form.hoursWorked) || 0,
      notes: form.notes,
      status: form.status,
    })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Log Time"
      description="Submit hours worked against a project task"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="timesheet-form" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Timesheet'}
          </Button>
        </div>
      }
    >
      <form id="timesheet-form" onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Employee">
          <Select value={form.employeeId} onChange={(e) => { set('employeeId', e.target.value); set('taskId', '') }} required>
            <option value="">Select employee</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </Select>
        </FormField>
        <FormField label="Project">
          <Select value={form.projectId} onChange={(e) => { set('projectId', e.target.value); set('taskId', '') }} required>
            <option value="">Select project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </FormField>
        <FormField label="Task">
          <Select value={form.taskId} onChange={(e) => set('taskId', e.target.value)} required>
            <option value="">Select task</option>
            {projectTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </Select>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Date">
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
          </FormField>
          <FormField label="Hours">
            <Input type="number" min="0.5" step="0.5" value={form.hoursWorked} onChange={(e) => set('hoursWorked', e.target.value)} required />
          </FormField>
        </div>
        <FormField label="Notes">
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="What did you work on?" className="min-h-[72px] resize-none" />
        </FormField>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </form>
    </Dialog>
  )
}
