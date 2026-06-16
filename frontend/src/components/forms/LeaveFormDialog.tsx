import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { FormField } from './FormField'
import { useEntityCrud } from '@/hooks/useEntityCrud'
import type { Leave, Employee } from '@/types'

interface LeaveFormDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  employees: Employee[]
  leave?: Leave | null
}

export function LeaveFormDialog({ open, onClose, onSaved, employees, leave }: LeaveFormDialogProps) {
  const { create, update, loading, error } = useEntityCrud<Leave>('/leaves', onSaved)
  const [form, setForm] = useState({
    employeeId: '',
    type: 'Annual Leave',
    startDate: '',
    endDate: '',
    reason: '',
    status: 'Pending',
  })

  useEffect(() => {
    if (!open) return
    setForm(leave ? {
      employeeId: leave.employeeId,
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason: leave.reason,
      status: leave.status,
    } : {
      employeeId: employees.length === 1 ? employees[0].id : '',
      type: 'Annual Leave',
      startDate: '',
      endDate: '',
      reason: '',
      status: 'Pending',
    })
  }, [open, leave, employees])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const start = new Date(form.startDate)
    const end = new Date(form.endDate)
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    const payload = { ...form, days, status: form.status }
    if (leave) await update(leave.id, payload)
    else await create(payload)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={leave ? 'Manage Leave' : 'Request Leave'}
      description="Submit or update a leave request"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="leave-form" disabled={loading}>
            {loading ? 'Saving...' : leave ? 'Update' : 'Submit Request'}
          </Button>
        </div>
      }
    >
      <form id="leave-form" onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Employee">
          <Select value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} required disabled={!!leave}>
            <option value="">Select employee</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </Select>
        </FormField>
        <FormField label="Leave Type">
          <Select value={form.type} onChange={(e) => set('type', e.target.value)}>
            {['Annual Leave', 'Sick Leave', 'Unpaid Leave'].map((t) => <option key={t} value={t}>{t}</option>)}
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
        <FormField label="Reason">
          <Textarea value={form.reason} onChange={(e) => set('reason', e.target.value)} className="min-h-[72px] resize-none" />
        </FormField>
        {leave && (
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {['Pending', 'Approved', 'Rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>
        )}
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </form>
    </Dialog>
  )
}
