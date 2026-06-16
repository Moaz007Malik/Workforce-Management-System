import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { PcpStatusChip } from '@/components/pcp/PcpStatusChip'
import { usePcpStore } from '@/stores/usePcpStore'
import { api } from '@/lib/api'
import { formatAed } from '@/lib/utils'
import type { PcpRevision } from '@/types'

interface CompareResult {
  pcpNo?: string
  revA?: PcpRevision
  revB?: PcpRevision
  deltaSummary?: string
  changes: { field: string; position: string; oldValue: string; newValue: string }[]
  monthlyTotalA?: number | null
  monthlyTotalB?: number | null
  headcountA?: number | null
  headcountB?: number | null
  monthlyDelta?: number | null
  headcountDelta?: number | null
}

export function PcpRevisions() {
  const [params, setParams] = useSearchParams()
  const pcpId = params.get('pcpId') || 'pcp-1'
  const { revisions, fetchRevisions, requests, fetchRequests } = usePcpStore()
  const [revA, setRevA] = useState('0')
  const [revB, setRevB] = useState('1')
  const [compare, setCompare] = useState<CompareResult | null>(null)
  const [comparing, setComparing] = useState(false)

  useEffect(() => {
    fetchRevisions(pcpId)
    fetchRequests({ role: 'Admin' })
  }, [fetchRevisions, fetchRequests, pcpId])

  useEffect(() => {
    if (revisions.length >= 2) {
      setRevA(String(revisions[0].revision))
      setRevB(String(revisions[revisions.length - 1].revision))
    } else if (revisions.length === 1) {
      setRevA(String(revisions[0].revision))
      setRevB(String(revisions[0].revision))
    }
  }, [revisions, pcpId])

  useEffect(() => {
    if (!pcpId || revisions.length === 0) return
    setComparing(true)
    api
      .get<CompareResult>(`/pcp/revisions/compare?pcpId=${pcpId}&revA=${revA}&revB=${revB}`)
      .then(setCompare)
      .catch(() => setCompare({ changes: [], deltaSummary: 'Unable to load comparison' }))
      .finally(() => setComparing(false))
  }, [pcpId, revA, revB, revisions.length])

  const pcp = requests.find((r) => r.id === pcpId)
  const canCompare = revisions.length >= 2 && revA !== revB
  const costChanges = (compare?.changes || []).filter((c) => c.field === 'Monthly Cost')
  const totalCostDelta = compare?.monthlyDelta ?? costChanges.reduce(
    (sum, c) => sum + (parseInt(c.newValue, 10) - parseInt(c.oldValue, 10)),
    0
  )

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Revision History</h1>
          <p className="text-muted-foreground">
            {pcp?.pcpNo ? `${pcp.pcpNo} · ` : ''}Every change tracked — nothing changes silently
          </p>
        </div>
        <Select value={pcpId} onChange={(e) => setParams({ pcpId: e.target.value })} className="w-full sm:w-64">
          {requests.map((r) => (
            <option key={r.id} value={r.id}>{r.pcpNo} — {r.client}</option>
          ))}
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {revisions.length ? revisions.map((rev) => (
              <div key={rev.id} className="relative border-l-2 border-accent pl-4">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">Rev. {rev.revision}</p>
                  <PcpStatusChip status={rev.status as 'Approved' | 'In Approval' | 'Draft'} />
                </div>
                <p className="text-sm text-muted-foreground">{rev.date} · {rev.author}</p>
                <p className="mt-1 text-sm">{rev.summary}</p>
                {rev.justification && (
                  <p className="mt-1 text-xs text-amber-800">Justification: {rev.justification}</p>
                )}
                {rev.changes && rev.changes.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">{rev.changes.length} change(s) in this revision</p>
                )}
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No revisions recorded for this PCP.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Compare View</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {revisions.length < 2 ? (
              <p className="text-sm text-muted-foreground">
                This PCP has only one revision snapshot. Select another PCP with multiple revisions to compare.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select value={revA} onChange={(e) => setRevA(e.target.value)} className="flex-1">
                    {revisions.map((r) => (
                      <option key={r.id} value={String(r.revision)}>Rev. {r.revision}</option>
                    ))}
                  </Select>
                  <span className="text-center text-muted-foreground">vs</span>
                  <Select value={revB} onChange={(e) => setRevB(e.target.value)} className="flex-1">
                    {revisions.map((r) => (
                      <option key={r.id} value={String(r.revision)}>Rev. {r.revision}</option>
                    ))}
                  </Select>
                </div>

                {comparing ? (
                  <p className="text-sm text-muted-foreground">Comparing revisions…</p>
                ) : (
                  <>
                    {compare?.revA && compare?.revB && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Rev. {compare.revA.revision}</p>
                          <p className="mt-1 line-clamp-2">{compare.revA.summary}</p>
                          {compare.monthlyTotalA != null && (
                            <p className="mt-2 font-medium">{formatAed(compare.monthlyTotalA)}/mo</p>
                          )}
                          {compare.headcountA != null && (
                            <p className="text-xs text-muted-foreground">{compare.headcountA} positions</p>
                          )}
                        </div>
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                          <p className="text-xs font-semibold uppercase text-primary">Rev. {compare.revB.revision}</p>
                          <p className="mt-1 line-clamp-2">{compare.revB.summary}</p>
                          {compare.monthlyTotalB != null && (
                            <p className="mt-2 font-medium">{formatAed(compare.monthlyTotalB)}/mo</p>
                          )}
                          {compare.headcountB != null && (
                            <p className="text-xs text-muted-foreground">{compare.headcountB} positions</p>
                          )}
                        </div>
                      </div>
                    )}

                    {canCompare && compare?.changes?.length ? (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-medium">
                        {compare.deltaSummary}
                        {totalCostDelta !== 0 && totalCostDelta != null && !Number.isNaN(totalCostDelta) && (
                          <span className="block mt-1 text-primary">
                            Net cost impact: {totalCostDelta > 0 ? '+' : ''}{formatAed(totalCostDelta)}/mo
                          </span>
                        )}
                      </div>
                    ) : canCompare ? (
                      <p className="text-sm text-muted-foreground">{compare?.deltaSummary}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Select two different revisions to compare.</p>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="py-2 pr-2">Position</th>
                            <th className="pr-2">Field</th>
                            <th>Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(compare?.changes || []).map((c, i) => (
                            <tr key={i} className="border-b bg-amber-500/10">
                              <td className="py-3 pr-2 font-medium">{c.position}</td>
                              <td className="pr-2 text-muted-foreground">{c.field}</td>
                              <td>
                                <span className="text-muted-foreground line-through">{c.oldValue}</span>
                                {' → '}
                                <span className="font-semibold text-primary">{c.newValue}</span>
                              </td>
                            </tr>
                          ))}
                          {canCompare && !compare?.changes?.length && (
                            <tr>
                              <td colSpan={3} className="py-4 text-center text-muted-foreground">
                                No field-level changes between Rev. {revA} and Rev. {revB}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
            <p className="text-xs text-muted-foreground">Approved revisions are structured for future SAP integration.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
