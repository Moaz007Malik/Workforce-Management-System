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
import { SYSTEM_ROLE_LABELS, SYSTEM_ROLES, canManageRoles, canManageEmployees, normalizeSystemRole } from '@/lib/roles'
import { useEffectiveRoles } from '@/lib/useEffectiveRoles'
import { useEmployeeStore } from '@/stores/useEmployeeStore'
import type { Employee, PcpRole, SystemRole } from '@/types'

const PCP_ROLES: PcpRole[] = ['Requester', 'Approver', 'Admin', 'Executive']

const DEFAULT_SKILLS = ['Project Management', 'HSE', 'Electrical', 'Mechanical', 'Welding', 'Human Resources']
const FALLBACK_DEPARTMENTS = ['Operations', 'Facilities', 'Corporate HR', 'Logistics', 'MEP']

const emptyForm = {
  fullName: '',
  email: '',
  department: FALLBACK_DEPARTMENTS[0],
  designation: '',
  hourlyRate: '',
  monthlySalary: '',
  capacityHours: '40',
  systemRole: 'Employee' as SystemRole,
  pcpRole: '' as PcpRole | '',
  password: '',
  active: true,
  onLeave: false,
  approvalDelegateId: '',
}

interface EmployeeFormDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  employee?: Employee | null
}

export function EmployeeFormDialog({ open, onClose, onSaved, employee }: EmployeeFormDialogProps) {
  const { create, update, loading, error, setError } = useEntityCrud<Employee>('/employees', onSaved)
  const { systemRole: viewerRole } = useEffectiveRoles()
  const { employees, fetchEmployees } = useEmployeeStore()
  const [form, setForm] = useState(emptyForm)
  const [pendingDocs, setPendingDocs] = useState<File[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [skillOptions, setSkillOptions] = useState(DEFAULT_SKILLS)
  const [customSkill, setCustomSkill] = useState('')
  const [departments, setDepartments] = useState(FALLBACK_DEPARTMENTS)

  const canEditRoles = canManageRoles(viewerRole) || normalizeSystemRole(viewerRole) === 'HR'
  const canEditAccount = canManageEmployees(viewerRole)

  useEffect(() => {
    if (open && canEditAccount) void fetchEmployees()
  }, [open, canEditAccount, fetchEmployees])

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
      systemRole: normalizeSystemRole(employee.systemRole),
      pcpRole: employee.pcpRole || '',
      password: '',
      active: employee.active !== false,
      onLeave: Boolean(employee.onLeave),
      approvalDelegateId: employee.approvalDelegateId || '',
    } : emptyForm)

    api.get<{ name: string }[]>('/skills')
      .then((skills) => {
        const names = skills.map((s) => s.name)
        setSkillOptions([...new Set([...DEFAULT_SKILLS, ...names, ...(employee?.skills || [])])])
      })
      .catch(() => {
        setSkillOptions([...new Set([...DEFAULT_SKILLS, ...(employee?.skills || [])])])
      })

    api.get<{ name: string }[]>('/departments')
      .then((depts) => {
        const names = depts.map((d) => d.name)
        if (names.length) setDepartments(names)
      })
      .catch(() => setDepartments(FALLBACK_DEPARTMENTS))
  }, [open, employee])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
  }

  const addCustomSkill = () => {
    const skill = customSkill.trim()
    if (!skill) return
    if (!selectedSkills.includes(skill)) setSelectedSkills((prev) => [...prev, skill])
    if (!skillOptions.includes(skill)) setSkillOptions((prev) => [...prev, skill])
    setCustomSkill('')
  }

  const roleOptions = SYSTEM_ROLES.filter((r) => {
    if (r === 'Admin' && !canManageRoles(viewerRole)) return false
    return true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSkills.length === 0) {
      setError('Select at least one skill')
      return
    }
    if (!employee && pendingDocs.length === 0) {
      setError('Upload at least one employee document (ID, contract, certificate, etc.)')
      return
    }

    const payload: Record<string, unknown> = {
      fullName: form.fullName,
      email: form.email,
      department: form.department,
      businessUnit: form.department,
      designation: form.designation,
      skills: selectedSkills,
      hourlyRate: Number(form.hourlyRate) || 0,
      monthlySalary: Number(form.monthlySalary) || 0,
      capacityHours: Number(form.capacityHours) || 40,
    }

    if (canEditRoles) {
      payload.systemRole = form.systemRole
    }

    if (canEditAccount) {
      payload.pcpRole = form.pcpRole || null
      payload.active = form.active
      payload.onLeave = form.onLeave
      payload.approvalDelegateId = form.approvalDelegateId || null
      if (form.password.trim()) {
        if (form.password.trim().length < 6) {
          setError('Password must be at least 6 characters')
          return
        }
        payload.password = form.password.trim()
      }
    }

    let entityId = employee?.id
    try {
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
    } catch {
      // error set by useEntityCrud
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={employee ? 'Edit Employee' : 'Add Employee'}
      description={employee ? 'Update employee profile and documents' : 'Add a team member with required documents'}
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
            <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Full name" required />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="name@wms.com" required />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Department">
            <Select value={form.department} onChange={(e) => set('department', e.target.value)}>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </FormField>
          <FormField label="Designation">
            <Input value={form.designation} onChange={(e) => set('designation', e.target.value)} placeholder="Job title" required />
          </FormField>
        </div>

        {canEditRoles && (
          <FormField label="System Role">
            <Select value={form.systemRole} onChange={(e) => set('systemRole', e.target.value)}>
              {roleOptions.map((r) => (
                <option key={r} value={r}>{SYSTEM_ROLE_LABELS[r]}</option>
              ))}
            </Select>
          </FormField>
        )}

        {canEditAccount && (
          <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium">Login & access</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={employee ? 'New password (optional)' : 'Password (optional)'}>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder={employee ? 'Leave blank to keep current' : 'Default role password if empty'}
                  autoComplete="new-password"
                />
              </FormField>
              <FormField label="PCP role (optional)">
                <Select value={form.pcpRole} onChange={(e) => set('pcpRole', e.target.value)}>
                  <option value="">None</option>
                  {PCP_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
              </FormField>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                Active account
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.onLeave}
                  onChange={(e) => setForm((f) => ({ ...f, onLeave: e.target.checked }))}
                />
                On leave
              </label>
            </div>
            {form.pcpRole && (
              <FormField label="Approval delegate">
                <Select value={form.approvalDelegateId} onChange={(e) => set('approvalDelegateId', e.target.value)}>
                  <option value="">None</option>
                  {employees.filter((e) => e.id !== employee?.id).map((e) => (
                    <option key={e.id} value={e.id}>{e.fullName}</option>
                  ))}
                </Select>
              </FormField>
            )}
          </div>
        )}

        <FormField label="Skills (select at least one)">
          <div className="space-y-3">
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedSkills.map((skill) => (
                  <Badge key={skill} variant="default" className="gap-1 pr-1">
                    {skill}
                    <button type="button" className="rounded-full p-0.5 hover:bg-primary-foreground/20" onClick={() => toggleSkill(skill)}>
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
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground',
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
          required={!employee}
        />

        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </form>
    </Dialog>
  )
}
