import { type ReactNode } from 'react'
import { Label } from '@/components/ui/label'

export function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <Label>
      {children} <span className="text-primary">*</span>
    </Label>
  )
}
