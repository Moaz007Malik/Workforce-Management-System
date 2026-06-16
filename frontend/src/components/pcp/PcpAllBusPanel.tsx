import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PcpStatusChip } from '@/components/pcp/PcpStatusChip'
import { formatAed } from '@/lib/utils'
import { PCP_BUS_UNITS, vacantPositionCount } from '@/lib/pcpStats'
import type { PcpRequest } from '@/types'

interface BuStats {
  name: string
  total: number
  inApproval: number
  approved: number
  draft: number
  monthly: number
  vacant: number
}

interface PcpAllBusPanelProps {
  requests: PcpRequest[]
  businessUnits?: string[]
}

export function PcpAllBusPanel({ requests, businessUnits }: PcpAllBusPanelProps) {
  const bus = businessUnits?.length ? businessUnits : PCP_BUS_UNITS

  const buStats = useMemo<BuStats[]>(() => bus.map((name) => {
    const buReqs = requests.filter((r) => r.businessUnit === name)
    return {
      name,
      total: buReqs.length,
      inApproval: buReqs.filter((r) => r.status === 'In Approval').length,
      approved: buReqs.filter((r) => r.status === 'Approved').length,
      draft: buReqs.filter((r) => r.status === 'Draft').length,
      monthly: buReqs.reduce((s, r) => s + (r.monthlyTotal || 0), 0),
      vacant: vacantPositionCount(buReqs),
    }
  }), [bus, requests])

  const slaAtRisk = useMemo(
    () => requests
      .filter((r) => r.status === 'In Approval' && (r.slaHoursRemaining ?? 999) <= 24)
      .sort((a, b) => (a.slaHoursRemaining ?? 0) - (b.slaHoursRemaining ?? 0)),
    [requests]
  )

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <Card>
        <CardHeader><CardTitle>PCPs by Business Unit</CardTitle></CardHeader>
        <CardContent className="table-scroll px-0 pt-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pl-4 pr-4">Business Unit</th>
                <th className="py-2 px-2 text-center">PCPs</th>
                <th className="py-2 px-2 text-center">In Approval</th>
                <th className="py-2 px-2 text-center">Approved</th>
                <th className="py-2 px-2 text-center">Draft</th>
                <th className="py-2 px-2 text-center">Vacant</th>
                <th className="py-2 pl-2 pr-4 text-right">Monthly Cost</th>
              </tr>
            </thead>
            <tbody>
              {buStats.map((bu) => (
                <tr key={bu.name} className="border-b last:border-0">
                  <td className="py-3 pl-4 pr-4 font-medium">{bu.name}</td>
                  <td className="py-3 px-2 text-center">{bu.total}</td>
                  <td className="py-3 px-2 text-center text-amber-600 font-medium">{bu.inApproval}</td>
                  <td className="py-3 px-2 text-center text-emerald-600">{bu.approved}</td>
                  <td className="py-3 px-2 text-center text-muted-foreground">{bu.draft}</td>
                  <td className="py-3 px-2 text-center">{bu.vacant}</td>
                  <td className="py-3 pl-2 pr-4 text-right font-medium">{formatAed(bu.monthly)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>PCP Approvals at SLA Risk</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {slaAtRisk.length ? slaAtRisk.map((r) => (
            <Link
              key={r.id}
              to="/pcp/approval"
              className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3 transition-colors hover:bg-primary/10"
            >
              <div>
                <p className="font-medium text-accent">{r.pcpNo}</p>
                <p className="text-xs text-muted-foreground">{r.businessUnit} · {r.currentStage}</p>
              </div>
              <span className="text-sm font-semibold text-primary">{r.slaHoursRemaining}h left</span>
            </Link>
          )) : (
            <p className="text-sm text-muted-foreground">No PCP approvals at SLA risk.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Personnel Cost by Business Unit</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {buStats.map((bu) => {
            const max = Math.max(...buStats.map((b) => b.monthly), 1)
            const pct = Math.round((bu.monthly / max) * 100)
            return (
              <div key={bu.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium truncate pr-2">{bu.name}</span>
                  <span className="text-muted-foreground shrink-0">{formatAed(bu.monthly)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent PCP Activity</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {requests.slice(0, 6).map((r) => (
            <Link key={r.id} to={`/pcp/requests/${r.id}`} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
              <div>
                <p className="font-medium text-accent">{r.pcpNo}</p>
                <p className="text-sm text-muted-foreground">{r.businessUnit} · {r.client}</p>
              </div>
              <div className="flex items-center gap-2">
                {r.status === 'In Approval' && r.slaHoursRemaining != null && (
                  <span className={`text-xs ${r.slaHoursRemaining < 12 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                    SLA {r.slaHoursRemaining}h
                  </span>
                )}
                <PcpStatusChip status={r.status} />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
