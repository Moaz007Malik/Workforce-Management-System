import { ArrowRight } from 'lucide-react'

export function ApprovalChainPreview({ steps }: { steps: string[] }) {
  if (!steps.length) return null
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Approval chain</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {steps.map((step, i) => (
          <span key={step} className="flex items-center gap-2">
            <span className="rounded-md bg-card px-2 py-1 shadow-sm">{step}</span>
            {i < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </span>
        ))}
      </div>
    </div>
  )
}
