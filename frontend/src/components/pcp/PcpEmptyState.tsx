import { FilePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export function PcpEmptyState({ title, description, actionLabel = 'Create your first request', actionTo = '/pcp/new' }: {
  title: string
  description: string
  actionLabel?: string
  actionTo?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FilePlus className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      <Link to={actionTo}>
        <Button className="mt-6 bg-primary hover:bg-primary/90">{actionLabel}</Button>
      </Link>
    </div>
  )
}
