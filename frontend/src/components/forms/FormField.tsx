import { Label } from '@/components/ui/label'
import { type ReactNode } from 'react'

export function FormField({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
