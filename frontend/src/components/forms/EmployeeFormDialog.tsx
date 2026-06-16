import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FormField } from './FormField'
import { DocumentUploadSection } from './DocumentUploadSection'
import { useEntityCrud } from '@/hooks/useEntityCrud'
import { uploadPendingDocuments } from '@/lib/documents'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Employee } from '@/types'

const DEPARTMENTS = ['Engineering', 'Design', 'Product', 'QA']
const DEFAULT_SKILLS = ['React', 'Node.js', 'TypeScript', 'Python', 'AWS', 'UI/UX Design', 'Project Management', 'DevOps', 'SQL', 'Agile/Scrum']

const emptyForm = {
  fullName: '',
  email: '',
  department: DEPARTMENTS[0],
  designation: '',
  hourlyRate: '',
  monthlySalary: '',
  capacityHours: '40',
}

interface EmployeeFormDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  employee?: Employee | null
}

export function EmployeeFormDialog({ open, onClose, onSaved, employee }: EmployeeFormDialogProps) {
  const { create, update, loading, error, setError } = useEntityCrud<Employee>('/employees', onSaved)
  const [form, setForm] = useState(emptyForm)
  const [pendingDocs, setPendingDocs] = useState<File[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [skillOptions, setSkillOptions] = useState(DEFAULT_SKILLS)
  const [customSkill, setCustomSkill] = useState('')

  useEffect(() => {
    if (!open) return
    setPendingDocs([])
    setCustomSkill('')
    setSelectedSkills(employee?.skills?.length ? [...employee.skills] : [])
    setForm(employee ? {
      fullName: employee.fullName,
      email: employee.email,
      department: employee.department,
      designation: employee.designation,
      hourlyRate: employee.hourlyRate?.toString() || '',
      monthlySalary: employee.monthlySalary?.toString() || '',
      capacityHours: employee.capacityHours?.toString() || '40',
    } : emptyForm)

    api.get<{ name: string }[]>('/skills')
      .then((skills) => {
        const names = skills.map((s) => s.name)
        setSkillOptions([...new Set([...DEFAULT_SKILLS, ...names, ...(employee?.skills || [])])])
      })
      .catch(() => {
        setSkillOptions([...new Set([...DEFAULT_SKILLS, ...(employee?.skills || [])])])
      })
  }, [open, employee])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  const addCustomSkill = () => {
    const skill = customSkill.trim()
    if (!skill) return
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills((prev) => [...prev, skill])
    }
    if (!skillOptions.includes(skill)) {
      setSkillOptions((prev) => [...prev, skill])
    }
    setCustomSkill('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSkills.length === 0) {
      setError('Select at least one skill')
      return
    }
    const payload = {
      fullName: form.fullName,
      email: form.email,
      department: form.department,
      designation: form.designation,
      skills: selectedSkills,
      hourlyRate: Number(form.hourlyRate) || 0,
      monthlySalary: Number(form.monthlySalary) || 0,
      capacityHours: Number(form.capacityHours) || 40,
    }
    let entityId = employee?.id
    if (employee) {
      await update(employee.id, payload)
    } else {
      const created = await create(payload)
      entityId = created.id
    }
    if (entityId && pendingDocs.length > 0) {
      await uploadPendingDocuments('employee', entityId, pendingDocs)
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={employee ? 'Edit Employee' : 'Add New Employee'}
      description={employee ? 'Update employee profile and capacity' : 'Add a team member to the resource pool'}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="employee-form" disabled={loading}>
            {loading ? 'Saving...' : employee ? 'Save Changes' : 'Add Employee'}
          </Button>
        </div>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full Name">
            <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="John Smith" required />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="john@company.com" required />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Department">
            <Select value={form.department} onChange={(e) => set('department', e.target.value)}>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </FormField>
          <FormField label="Designation">
            <Input value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="Senior Developer" required />
          </FormField>
        </div>

        <FormField label="Skills (select at least one)">
          <div className="space-y-3">
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedSkills.map((skill) => (
                  <Badge key={skill} variant="default" className="gap-1 pr-1">
                    {skill}
                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-primary-foreground/20"
                      onClick={() => toggleSkill(skill)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {skillOptions.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    selectedSkills.includes(skill)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {skill}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                placeholder="Add custom skill"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill() } }}
              />
              <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1" onClick={addCustomSkill}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </div>
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Hourly Rate (AED)">
            <Input type="number" min="0" value={form.hourlyRate} onChange={(e) => set('hourlyRate', e.target.value)} placeholder="85" required />
          </FormField>
          <FormField label="Monthly Salary (AED)">
            <Input type="number" min="0" value={form.monthlySalary} onChange={(e) => set('monthlySalary', e.target.value)} placeholder="13600" />
          </FormField>
          <FormField label="Capacity (h/wk)">
            <Input type="number" min="1" value={form.capacityHours} onChange={(e) => set('capacityHours', e.target.value)} required />
          </FormField>
        </div>

        <DocumentUploadSection
          entityType="employee"
          entityId={employee?.id}
          pendingFiles={pendingDocs}
          onPendingChange={setPendingDocs}
          disabled={loading}
        />

        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </form>
    </Dialog>
  )
}
