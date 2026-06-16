import { useEffect, useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { FormField } from './FormField'
import { useEntityCrud } from '@/hooks/useEntityCrud'
import type { Attendance, AttendanceStatus, Employee } from '@/types'

const STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Half Day', 'On Leave']
const LOCATIONS = ['Site', 'Office', 'Remote'] as const

interface AttendanceFormDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  employees: Employee[]
  attendance?: Attendance | null
  defaultDate?: string
  recordedBy?: string
}

export function AttendanceFormDialog({
  open,
  onClose,
  onSaved,
  employees,
  attendance,
  defaultDate,
  recordedBy,
}: AttendanceFormDialogProps) {
  const { create, update, loading, error } = useEntityCrud<Attendance>('/attendance', onSaved)
  const [form, setForm] = useState({
    employeeId: '',
    date: defaultDate || new Date().toISOString().slice(0, 10),
    checkIn: '08:30',
    checkOut: '17:00',
    status: 'Present' as AttendanceStatus,
    location: 'Site' as (typeof LOCATIONS)[number],
    notes: '',
  })

  useEffect(() => {
    if (!open) return
    setForm(attendance ? {
      employeeId: attendance.employeeId,
      date: attendance.date,
      checkIn: attendance.checkIn || '',
      checkOut: attendance.checkOut || '',
      status: attendance.status,
      location: (attendance.location as typeof form.location) || 'Site',
      notes: attendance.notes || '',
    } : {
      employeeId: employees.length === 1 ? employees[0].id : '',
      date: defaultDate || new Date().toISOString().slice(0, 10),
      checkIn: '08:30',
      checkOut: '17:00',
      status: 'Present',
      location: 'Site',
      notes: '',
    })
  }, [open, attendance, employees, defaultDate])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const calcHours = () => {
    if (!form.checkIn || !form.checkOut || form.status === 'Absent' || form.status === 'On Leave') return 0
    const [inH, inM] = form.checkIn.split(':').map(Number)
    const [outH, outM] = form.checkOut.split(':').map(Number)
    const mins = (outH * 60 + outM) - (inH * 60 + inM)
    return Math.max(0, Math.round((mins / 60) * 10) / 10)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      employeeId: form.employeeId,
      date: form.date,
      status: form.status,
      location: form.location,
      notes: form.notes,
      checkIn: form.status === 'Absent' || form.status === 'On Leave' ? undefined : form.checkIn || undefined,
      checkOut: form.status === 'Absent' || form.status === 'On Leave' ? undefined : form.checkOut || undefined,
      workHours: calcHours(),
      recordedBy,
    }
    if (attendance) await update(attendance.id, payload)
    else await create(payload)
    onClose()
  }

  const showTimes = form.status !== 'Absent' && form.status !== 'On Leave'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={attendance ? 'Edit Attendance' : 'Mark Attendance'}
      description="Record daily check-in, status, and location"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="attendance-form" disabled={loading}>
            {loading ? 'Saving...' : attendance ? 'Update' : 'Save'}
          </Button>
        </div>
      }
    >
      <form id="attendance-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Employee">
            <Select value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} required disabled={!!attendance}>
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.fullName} · {e.department}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Date">
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required disabled={!!attendance} />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => set('status', e.target.value)} required>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="Location">
            <Select value={form.location} onChange={(e) => set('location', e.target.value)}>
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
          </FormField>
        </div>
        {showTimes && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Check-in">
              <Input type="time" value={form.checkIn} onChange={(e) => set('checkIn', e.target.value)} />
            </FormField>
            <FormField label="Check-out">
              <Input type="time" value={form.checkOut} onChange={(e) => set('checkOut', e.target.value)} />
            </FormField>
          </div>
        )}
        <FormField label="Notes">
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Optional remarks" />
        </FormField>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </Dialog>
  )
}
