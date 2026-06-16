import { useState, useEffect } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { FormField } from './FormField'
import { useEntityCrud } from '@/hooks/useEntityCrud'
import type { Risk, Issue, Employee } from '@/types'

type Entity = Risk | Issue

interface RiskIssueFormDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  type: 'risk' | 'issue'
  projectId: string
  employees: Employee[]
  item?: Risk | Issue | null
}

export function RiskIssueFormDialog({ open, onClose, onSaved, type, projectId, employees, item }: RiskIssueFormDialogProps) {
  const endpoint = type === 'risk' ? '/risks' : '/issues'
  const { create, update, loading, error } = useEntityCrud<Entity>(endpoint, onSaved)
  const isRisk = type === 'risk'
  const risk = item as Risk | undefined
  const issue = item as Issue | undefined

  const [form, setForm] = useState({
    text: '',
    owner: '',
    status: 'Open',
    probability: 'Medium',
    impact: 'Medium',
    mitigation: '',
    resolution: '',
    priority: 'Medium',
  })

  useEffect(() => {
    if (!open) return
    setForm({
      text: isRisk ? risk?.risk || '' : issue?.issue || '',
      owner: item?.owner || '',
      status: item?.status || 'Open',
      probability: risk?.probability || 'Medium',
      impact: risk?.impact || 'Medium',
      mitigation: risk?.mitigation || '',
      resolution: issue?.resolution || '',
      priority: issue?.priority || 'Medium',
    })
  }, [open, item, isRisk, risk, issue])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ownerName = employees.find((e) => e.id === form.owner)?.fullName || form.owner
    if (isRisk) {
      const payload = { projectId, risk: form.text, owner: ownerName, probability: form.probability, impact: form.impact, mitigation: form.mitigation, status: form.status }
      if (item) await update(item.id, payload)
      else await create(payload)
    } else {
      const payload = { projectId, issue: form.text, owner: ownerName, status: form.status, resolution: form.resolution, priority: form.priority }
      if (item) await update(item.id, payload)
      else await create(payload)
    }
    onClose()
  }

  const formId = isRisk ? 'risk-form' : 'issue-form'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? `Edit ${isRisk ? 'Risk' : 'Issue'}` : `Add ${isRisk ? 'Risk' : 'Issue'}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form={formId} disabled={loading}>
            {loading ? 'Saving...' : item ? 'Update' : 'Add'}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5">
        <FormField label={isRisk ? 'Risk Description' : 'Issue Description'}>
          <Textarea value={form.text} onChange={(e) => set('text', e.target.value)} required className="min-h-[72px] resize-none" />
        </FormField>
        <FormField label="Owner">
          <Select value={form.owner} onChange={(e) => set('owner', e.target.value)} required>
            <option value="">Select owner</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName}</option>)}
          </Select>
        </FormField>
        {isRisk ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Probability">
                <Select value={form.probability} onChange={(e) => set('probability', e.target.value)}>
                  {['Low', 'Medium', 'High'].map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
              </FormField>
              <FormField label="Impact">
                <Select value={form.impact} onChange={(e) => set('impact', e.target.value)}>
                  {['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
              </FormField>
            </div>
            <FormField label="Mitigation Plan">
              <Textarea value={form.mitigation} onChange={(e) => set('mitigation', e.target.value)} className="min-h-[72px] resize-none" />
            </FormField>
          </>
        ) : (
          <>
            <FormField label="Priority">
              <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </FormField>
            <FormField label="Resolution">
              <Textarea value={form.resolution} onChange={(e) => set('resolution', e.target.value)} className="min-h-[72px] resize-none" />
            </FormField>
          </>
        )}
        <FormField label="Status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
            {(isRisk ? ['Open', 'Monitoring', 'Mitigated', 'Closed'] : ['Open', 'In Progress', 'Resolved', 'Closed']).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </FormField>
        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </form>
    </Dialog>
  )
}
