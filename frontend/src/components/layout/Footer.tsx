import { APP_NAME } from '@/lib/branding'

export function Footer() {
  return (
    <footer className="border-t border-border px-3 py-3 text-center text-xs text-muted-foreground sm:px-6 sm:py-4">
      {APP_NAME}
    </footer>
  )
}
