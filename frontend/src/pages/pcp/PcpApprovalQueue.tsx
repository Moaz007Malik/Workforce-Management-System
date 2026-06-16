import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, RotateCcw, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PcpStatusChip } from '@/components/pcp/PcpStatusChip'
import { SlaTimer } from '@/components/pcp/SlaTimer'
import { ValidationAlert } from '@/components/pcp/ValidationAlert'
import { usePcpStore } from '@/stores/usePcpStore'
import { useAppStore } from '@/stores/useAppStore'
import { formatAed } from '@/lib/utils'
import type { PcpRequest } from '@/types'

export function PcpApprovalQueue() {
  const { pcpRole, businessUnit } = useAppStore()
  const { queue, fetchQueue, actionRequest, fetchRequest } = usePcpStore()
  const [selected, setSelected] = useState<PcpRequest | null>(null)
  const [comment, setComment] = useState('')
  const [actionError, setActionError] = useState<string[]>([])

  useEffect(() => {
    fetchQueue({ role: pcpRole || 'Approver', businessUnit })
  }, [fetchQueue, pcpRole, businessUnit])

  const open = async (id: string) => {
    const detail = await fetchRequest(id)
    setSelected(detail)
    setActionError([])
  }

  const act = async (action: string) => {
    if (!selected) return
    if ((action === 'return' || action === 'reject') && !comment.trim()) {
      setActionError(['Comment is required for Return or Reject'])
      return
    }
    setActionError([])
    await actionRequest(selected.id, action, comment)
    setComment('')
    setSelected(null)
    fetchQueue({ role: pcpRole || 'Approver', businessUnit })
  }

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Approval Queue</h1>
        <p className="text-muted-foreground">Sorted by SLA urgency · fully usable on mobile</p>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-2">
          {queue.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => open(r.id)}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${selected?.id === r.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium text-accent">{r.pcpNo}</span>
                <PcpStatusChip status={r.status} />
              </div>
              <p className="text-sm text-muted-foreground">{r.client} · {formatAed(r.monthlyTotal || 0)}/mo</p>
              <p className={`mt-1 text-xs ${(r.slaHoursRemaining || 0) < 12 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                With {r.currentStage} · SLA: {r.slaHoursRemaining || 0}h remaining
              </p>
            </button>
          ))}
          {!queue.length && <p className="text-sm text-muted-foreground">No items pending approval.</p>}
        </div>

        {selected && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{selected.pcpNo} — Review</CardTitle>
                  <p className="text-sm text-muted-foreground">{selected.client} · Rev. {selected.revision}</p>
                </div>
                {selected.slaHoursRemaining != null && (
                  <SlaTimer hoursRemaining={selected.slaHoursRemaining} />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ValidationAlert errors={actionError} />

              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg bg-muted/40 p-4 text-sm">
                {selected.positions.map((p) => (
                  <div key={p.id} className={p.bandBreachJustification ? 'rounded border border-amber-500/30 bg-amber-500/10 p-2' : 'p-1'}>
                    <p className="font-medium">{p.title} · {p.grade} · {p.shift}</p>
                    <p>{formatAed(p.proposedSalary)}/mo · CC: {p.costCenters.map((c) => `${c.code} ${c.percent}%`).join(', ')}</p>
                    {p.bandBreachJustification && (
                      <p className="mt-1 text-xs text-amber-800">Band breach justification: {p.bandBreachJustification}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Approval Action</p>
                <Textarea placeholder="Comment (required for Return / Reject)" value={comment} onChange={(e) => setComment(e.target.value)} className="mb-3" />
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto" onClick={() => act('approve')}><Check className="h-4 w-4" /> Approve</Button>
                  <Button variant="outline" className="w-full border-accent text-accent sm:w-auto" onClick={() => act('return')}><RotateCcw className="h-4 w-4" /> Return for Revision</Button>
                  <Button variant="destructive" className="w-full sm:w-auto" onClick={() => act('reject')}><X className="h-4 w-4" /> Reject</Button>
                </div>
              </div>

              <div className="text-sm">
                <p className="mb-2 font-medium">Approval timeline</p>
                {selected.approvalTrail.map((t, i) => (
                  <p key={i} className="text-muted-foreground">
                    {t.at ? new Date(t.at).toLocaleDateString() : 'Pending'} — {t.step} by {t.by}
                    {t.tatHours != null && ` (TAT ${t.tatHours}h)`}
                  </p>
                ))}
              </div>

              <Link to={`/pcp/requests/${selected.id}`} className="text-sm text-accent hover:underline">Open full detail →</Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
