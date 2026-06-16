import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { FormField } from './FormField'
import { DocumentUploadSection } from './DocumentUploadSection'
import { useEntityCrud } from '@/hooks/useEntityCrud'
import { uploadPendingDocuments } from '@/lib/documents'
import type { Project, Employee } from '@/types'

interface ProjectFormDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  project?: Project | null
  employees: Employee[]
}

const emptyForm = {
  name: '',
  client: '',
  description: '',
  projectManagerId: '',
  startDate: '',
  endDate: '',
  status: 'Planned',
  budget: '',
  revenue: '',
  priority: 'Medium',
}

export function ProjectFormDialog({ open, onClose, onSaved, project, employees }: ProjectFormDialogProps) {
  const { create, update, loading, error } = useEntityCrud<Project>('/projects', onSaved)
  const [form, setForm] = useState(emptyForm)
  const [pendingDocs, setPendingDocs] = useState<File[]>([])

  useEffect(() => {
    if (!open) return
    setPendingDocs([])
    setForm(project ? {
      name: project.name,
      client: project.client,
      description: project.description,
      projectManagerId: project.projectManagerId || '',
      startDate: project.startDate,
      endDate: project.endDate,
      status: project.status,
      budget: project.budget?.toString() || '',
      revenue: project.revenue?.toString() || '',
      priority: project.priority,
    } : emptyForm)
  }, [open, project])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))
  const pm = employees.find((e) => e.id === form.projectManagerId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      client: form.client,
      description: form.description,
      projectManager: pm?.fullName || '',
      projectManagerId: form.projectManagerId,
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status as Project['status'],
      budget: Number(form.budget) || 0,
      revenue: Number(form.revenue) || 0,
      priority: form.priority,
      phases: project?.phases || [{ id: `phase-${Date.now()}`, name: 'Main Phase', milestones: [] }],
    }
    let entityId = project?.id
    if (project) {
      await update(project.id, payload)
    } else {
      const created = await create({ ...payload, projectId: `PRJ${Date.now().toString().slice(-4)}` })
      entityId = created.id
    }
    if (entityId && pendingDocs.length > 0) {
      await uploadPendingDocuments('project', entityId, pendingDocs)
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={project ? 'Edit Project' : 'Create New Project'}
      description={project ? 'Update project details and financials' : 'Add a new project to your portfolio'}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="project-form" disabled={loading}>
            {loading ? 'Saving...' : project ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Project Name">
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Cloud Migration" required />
          </FormField>
          <FormField label="Client">
            <Input value={form.client} onChange={(e) => set('client', e.target.value)} placeholder="e.g. Acme Corp" required />
          </FormField>
        </div>

        <FormField label="Description">
          <Textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Brief project overview..."
            className="min-h-[72px] resize-none"
          />
        </FormField>

        <FormField label="Project Manager">
          <Select value={form.projectManagerId} onChange={(e) => set('projectManagerId', e.target.value)} required>
            <option value="">Select manager</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </Select>
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Start Date">
            <Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} required />
          </FormField>
          <FormField label="End Date">
            <Input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} required />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {['Draft', 'Planned', 'Active', 'On Hold', 'Completed', 'Cancelled'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Priority">
            <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Budget (AED)">
            <Input type="number" min="0" value={form.budget} onChange={(e) => set('budget', e.target.value)} placeholder="500000" required />
          </FormField>
          <FormField label="Revenue (AED)">
            <Input type="number" min="0" value={form.revenue} onChange={(e) => set('revenue', e.target.value)} placeholder="750000" required />
          </FormField>
        </div>

        <DocumentUploadSection
          entityType="project"
          entityId={project?.id}
          pendingFiles={pendingDocs}
          onPendingChange={setPendingDocs}
          disabled={loading}
        />

        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </form>
    </Dialog>
  )
}
