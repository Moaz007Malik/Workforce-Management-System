import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PcpStatusChip } from '@/components/pcp/PcpStatusChip'
import { SapBadge } from '@/components/pcp/SapBadge'
import { VarianceBadge } from '@/components/pcp/VarianceBadge'
import { PriorityBadge } from '@/components/pcp/PriorityBadge'
import { SlaTimer } from '@/components/pcp/SlaTimer'
import { ApprovalChainPreview } from '@/components/pcp/ApprovalChainPreview'
import { usePcpStore } from '@/stores/usePcpStore'
import { useAppStore } from '@/stores/useAppStore'
import { formatAed } from '@/lib/utils'
import type { PcpRequest } from '@/types'

export function PcpDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const justSubmitted = searchParams.get('submitted') === '1'
  const { pcpRole } = useAppStore()
  const { fetchRequest, createRevision } = usePcpStore()
  const [pcp, setPcp] = useState<PcpRequest | null>(null)
  const [showRevise, setShowRevise] = useState(false)
  const [newShift, setNewShift] = useState('Night')
  const [justification, setJustification] = useState('Night shift premium required for site availability')
  const [revising, setRevising] = useState(false)

  const reload = () => {
    if (id) fetchRequest(id).then(setPcp)
  }

  useEffect(() => { reload() }, [id, fetchRequest])

  const createShiftRevision = async () => {
    if (!pcp) return
    const pos = pcp.positions[0]
    if (!pos) return
    const oldShift = pos.shift
    const oldMonthly = pos.monthlyBudget || 0
    const nightAllowance = 800
    const updatedPositions = pcp.positions.map((p, i) => {
      if (i !== 0) return p
      const benefits = [...(p.benefits || [])]
      if (!benefits.some((b) => b.name === 'Night Allowance')) {
        benefits.push({ name: 'Night Allowance', amount: nightAllowance })
      }
      const proposedSalary = p.proposedSalary || 0
      const monthlyBudget = proposedSalary + benefits.reduce((s, b) => s + b.amount, 0)
      return { ...p, shift: newShift, benefits, monthlyBudget }
    })
    const newMonthly = updatedPositions[0].monthlyBudget || oldMonthly + nightAllowance

    setRevising(true)
    try {
      await createRevision(pcp.id, {
        summary: `Rev. ${(pcp.revision || 0) + 1}: Shift changed ${oldShift} → ${newShift} for ${pos.title}; night-shift allowance added AED ${nightAllowance}/month.`,
        justification,
        changes: [
          { field: 'Shift', position: pos.title, oldValue: oldShift, newValue: newShift },
          { field: 'Monthly Cost', position: pos.title, oldValue: String(oldMonthly), newValue: String(newMonthly) },
        ],
        positions: updatedPositions,
      })
      setShowRevise(false)
      reload()
    } finally {
      setRevising(false)
    }
  }

  if (!pcp) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      {justSubmitted && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium">Submitted successfully — status is now <PcpStatusChip status="In Approval" /></p>
          <ApprovalChainPreview steps={['BU Head', 'Finance Manager', 'HR Director']} />
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold sm:text-2xl">{pcp.pcpNo}</h1>
            <PcpStatusChip status={pcp.status} />
            <SapBadge status={pcp.sapSync} />
            <PriorityBadge priority={pcp.priority} />
          </div>
          <p className="text-muted-foreground">{pcp.client} · {pcp.businessUnit} · Rev. {pcp.revision}</p>
        </div>
        <VarianceBadge value={pcp.budgetVsActual} />
      </div>

      {pcp.status === 'In Approval' && pcp.slaHoursRemaining != null && (
        <SlaTimer hoursRemaining={pcp.slaHoursRemaining} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Request Header</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm md:grid-cols-2">
            <p><span className="text-muted-foreground">Location:</span> {pcp.clientLocation}</p>
            <p><span className="text-muted-foreground">Recruitment:</span> {pcp.recruitmentType}</p>
            <p><span className="text-muted-foreground">WBS:</span> {pcp.wbs}</p>
            <p><span className="text-muted-foreground">Issue / Required:</span> {pcp.issueDate} → {pcp.requiredByDate}</p>
            <p><span className="text-muted-foreground">Requested by:</span> {pcp.requestedBy}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Financials</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Monthly: <strong>{formatAed(pcp.monthlyTotal || 0)}</strong></p>
            <p>Annual: <strong>{formatAed(pcp.annualTotal || 0)}</strong></p>
            <p>Stage: {pcp.currentStage}</p>
            {pcp.budgetVsActual != null && <VarianceBadge value={pcp.budgetVsActual} />}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Positions</CardTitle>
          {pcpRole === 'Requester' && (pcp.status === 'Approved' || pcp.status === 'Returned') && (
            <Button size="sm" variant="outline" className="border-accent text-accent" onClick={() => setShowRevise(true)}>
              Create Revision (shift change)
            </Button>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-2">Title</th><th>Grade</th><th>Shift</th><th>Count</th><th>Monthly</th><th>Budget vs Actual</th></tr></thead>
            <tbody>
              {pcp.positions.map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2 font-medium">{p.title}</td>
                  <td>{p.grade}</td>
                  <td>{p.shift}</td>
                  <td>{p.count}</td>
                  <td>{formatAed(p.monthlyBudget || 0)}</td>
                  <td>{p.actualCost != null ? <VarianceBadge value={((p.actualCost - (p.monthlyBudget || 1)) / (p.monthlyBudget || 1)) * 100} /> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Approval Trail</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {pcp.approvalTrail.map((t, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
              <div>
                <p className="font-medium">{t.step} — {t.by}</p>
                {t.at && <p className="text-muted-foreground">{new Date(t.at).toLocaleString()}{t.tatHours != null && ` (TAT ${t.tatHours}h)`}</p>}
                {t.slaDue && !t.at && <p className="text-amber-600">SLA due {new Date(t.slaDue).toLocaleString()}</p>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Link to={`/pcp/revisions?pcpId=${pcp.id}`} className="text-sm font-medium text-accent hover:underline">
        View revision history & compare →
      </Link>

      {showRevise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader><CardTitle>Create Rev. {(pcp.revision || 0) + 1}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Demo: change Electrician shift Day → Night (tracked in revision history)</p>
              <div>
                <label className="text-sm font-medium">New Shift</label>
                <Select value={newShift} onChange={(e) => setNewShift(e.target.value)} className="mt-1">
                  <option>Day</option><option>Night</option><option>Rotational</option>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Justification <span className="text-primary">*</span></label>
                <Textarea value={justification} onChange={(e) => setJustification(e.target.value)} className="mt-1" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowRevise(false)}>Cancel</Button>
                <Button className="bg-primary hover:bg-primary/90" onClick={createShiftRevision} disabled={revising || !justification.trim()}>
                  Submit Revision
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
