import { AlertCircle } from 'lucide-react'

export function ValidationAlert({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex gap-2 text-primary">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Please fix the following before continuing:</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}
