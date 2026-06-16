import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { PcpStatusChip } from '@/components/pcp/PcpStatusChip'
import { VarianceBadge } from '@/components/pcp/VarianceBadge'
import { PcpEmptyState } from '@/components/pcp/PcpEmptyState'
import { usePcpStore } from '@/stores/usePcpStore'
import { useEffectiveRoles } from '@/lib/useEffectiveRoles'

interface PcpListProps {
  mode?: 'mine' | 'all'
}

export function PcpList({ mode = 'mine' }: PcpListProps) {
  const { pcpRole, businessUnit, currentUserId } = useEffectiveRoles()
  const isExecutiveView = mode === 'all' && pcpRole === 'Executive'
  const { requests, masters, fetchRequests, fetchMasters } = usePcpStore()
  const [status, setStatus] = useState('All')
  const [client, setClient] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchMasters()
    fetchRequests({
      role: mode === 'all' ? (pcpRole === 'Executive' ? 'Executive' : 'Admin') : (pcpRole || 'Requester'),
      businessUnit: mode === 'all' ? '' : businessUnit,
      userId: currentUserId,
      status: status !== 'All' ? status : '',
      client: client !== 'All' ? client : '',
      search,
    })
  }, [fetchRequests, fetchMasters, pcpRole, businessUnit, currentUserId, mode, status, client, search])

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{mode === 'all' ? (isExecutiveView ? 'All PCPs (view only)' : 'PCPs (Personnel Cost Planning)') : 'My Requests'}</h1>
          <p className="text-muted-foreground">
            {isExecutiveView ? 'Read-only executive view — no edits' : 'Filterable list with export'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> PDF</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Excel</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="PCP No. or position title..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={client} onChange={(e) => setClient(e.target.value)} className="w-40">
          <option value="All">All Projects</option>
          {masters?.clients.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          {['All', 'Draft', 'In Approval', 'Approved', 'Rejected', 'Returned'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>

      {!requests.length ? (
        <PcpEmptyState title="No PCPs yet" description="Create your first personnel cost planning request to get started." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">PCP No.</th>
                <th className="px-4 py-3 text-left font-semibold">Client / Project</th>
                <th className="px-4 py-3 text-left font-semibold">Positions</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Current Stage</th>
                <th className="px-4 py-3 text-left font-semibold">Revision</th>
                <th className="px-4 py-3 text-left font-semibold">Budget vs Actual</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3"><Link to={`/pcp/requests/${r.id}`} className="font-medium text-accent hover:underline">{r.pcpNo}</Link></td>
                  <td className="px-4 py-3">{r.client}</td>
                  <td className="px-4 py-3">{r.positionSummary}</td>
                  <td className="px-4 py-3"><PcpStatusChip status={r.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.currentStage}
                    {r.slaHoursRemaining != null && r.status === 'In Approval' && (
                      <span className={r.slaHoursRemaining < 12 ? ' ml-1 text-primary' : ''}> · SLA: {r.slaHoursRemaining}h</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><Link to={`/pcp/revisions?pcpId=${r.id}`} className="text-accent hover:underline">Rev. {r.revision}</Link></td>
                  <td className="px-4 py-3"><VarianceBadge value={r.budgetVsActual} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
