import { useState } from 'react'
import { ClipboardList, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { FormField } from '@/components/forms/FormField'
import { api } from '@/lib/api'
import type { WorkAssignment } from '@/types'

interface Props {
  employeeId: string
  assignments: WorkAssignment[]
  canManage: boolean
  onUpdated: () => void
}

export function EmployeeAssignmentsCard({ employeeId, assignments, canManage, onUpdated }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState<WorkAssignment['status']>('Active')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.post(`/employees/${employeeId}/assignments`, {
        title,
        description,
        startDate,
        endDate: endDate || null,
        status,
      })
      setOpen(false)
      setTitle('')
      setDescription('')
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assignment')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (assignmentId: string) => {
    if (!window.confirm('Remove this assignment?')) return
    try {
      await api.delete(`/employees/${employeeId}/assignments/${assignmentId}`)
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove assignment')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <ClipboardList className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Work Assignments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No formal assignments recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{a.title}</p>
                  {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {a.startDate}{a.endDate ? ` → ${a.endDate}` : ''} · {a.status}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Assigned by {a.assignedByName}</p>
                </div>
                {canManage && (
                  <Button type="button" variant="ghost" size="icon" className="action-icon-btn shrink-0 text-destructive" onClick={() => remove(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canManage && !open && (
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Assignment
          </Button>
        )}

        {canManage && open && (
          <form onSubmit={submit} className="space-y-3 rounded-lg border border-border p-3">
            <FormField label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Site supervisor — Building A" required />
            </FormField>
            <FormField label="Description">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Start Date">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </FormField>
              <FormField label="End Date">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </FormField>
            </div>
            <FormField label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as WorkAssignment['status'])}>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </Select>
            </FormField>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving...' : 'Save Assignment'}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
