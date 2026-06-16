import { useState } from 'react'
import { Star, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/forms/FormField'
import { api } from '@/lib/api'
import type { PerformanceReview } from '@/types'

interface Props {
  employeeId: string
  reviews: PerformanceReview[]
  canManage: boolean
  onUpdated: () => void
}

export function EmployeePerformanceCard({ employeeId, reviews, canManage, onUpdated }: Props) {
  const [open, setOpen] = useState(false)
  const [period, setPeriod] = useState('')
  const [rating, setRating] = useState('3')
  const [goals, setGoals] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.post(`/employees/${employeeId}/performance`, {
        period,
        rating: Number(rating),
        goals,
        notes,
      })
      setOpen(false)
      setPeriod('')
      setGoals('')
      setNotes('')
      onUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save review')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Performance Tracking</CardTitle>
        </div>
        {avgRating && (
          <span className="text-sm text-muted-foreground">Avg: {avgRating}/5</span>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No performance reviews recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {reviews.slice(0, 5).map((r) => (
              <li key={r.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.period}</span>
                  <span className="flex items-center gap-0.5 text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {r.rating}/5
                  </span>
                </div>
                {r.goals && <p className="mt-1 text-xs text-muted-foreground">Goals: {r.goals}</p>}
                {r.notes && <p className="mt-1 text-xs">{r.notes}</p>}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {r.reviewerName} · {r.reviewDate}
                </p>
              </li>
            ))}
          </ul>
        )}

        {canManage && !open && (
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Review
          </Button>
        )}

        {canManage && open && (
          <form onSubmit={submit} className="space-y-3 rounded-lg border border-border p-3">
            <FormField label="Review Period">
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Q1 2026" required />
            </FormField>
            <FormField label="Rating (1–5)">
              <Input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} required />
            </FormField>
            <FormField label="Goals">
              <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={2} placeholder="Key objectives..." />
            </FormField>
            <FormField label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Review notes..." />
            </FormField>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving...' : 'Save Review'}</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
