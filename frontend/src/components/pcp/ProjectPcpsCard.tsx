import { Link } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PcpStatusChip } from '@/components/pcp/PcpStatusChip'
import { formatAed } from '@/lib/utils'
import type { PcpRequest } from '@/types'

interface ProjectPcpsCardProps {
  projectId: string
  projectName: string
  pcps: PcpRequest[]
  canCreate?: boolean
}

export function ProjectPcpsCard({ projectId, projectName, pcps, canCreate = true }: ProjectPcpsCardProps) {
  const monthlyTotal = pcps.reduce((s, r) => s + (r.monthlyTotal || 0), 0)
  const newPcpUrl = `/pcp/new?projectId=${projectId}`

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Personnel Cost Planning</CardTitle>
        </div>
        {canCreate && (
          <Link to={newPcpUrl}>
            <Button size="sm" variant="outline"><Plus className="h-4 w-4" /> New PCP</Button>
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {pcps.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {pcps.length} PCP{pcps.length !== 1 ? 's' : ''} · {formatAed(monthlyTotal)}/mo personnel cost
          </p>
        )}
        {pcps.length ? pcps.map((pcp) => (
          <Link
            key={pcp.id}
            to={`/pcp/requests/${pcp.id}`}
            className="block rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-accent">{pcp.pcpNo}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {pcp.businessUnit} · Rev. {pcp.revision}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pcp.positionSummary || `${pcp.positions?.length ?? 0} positions`}
                  {pcp.monthlyTotal != null && ` · ${formatAed(pcp.monthlyTotal)}/mo`}
                </p>
              </div>
              <PcpStatusChip status={pcp.status} />
            </div>
            {pcp.status === 'In Approval' && pcp.slaHoursRemaining != null && (
              <p className={`mt-2 text-xs ${pcp.slaHoursRemaining < 12 ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                SLA: {pcp.slaHoursRemaining}h remaining · {pcp.currentStage}
              </p>
            )}
          </Link>
        )) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No PCP requests linked to {projectName} yet.
            </p>
            {canCreate && (
              <Link to={newPcpUrl}>
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" /> Create PCP for this project
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
