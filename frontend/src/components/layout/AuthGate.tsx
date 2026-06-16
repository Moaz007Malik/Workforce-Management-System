import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const ready = useAuthStore((s) => s.ready)

  useEffect(() => {
    const bootstrap = () => {
      void useAuthStore.getState().restoreSession()
    }

    if (useAuthStore.persist.hasHydrated()) {
      bootstrap()
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(bootstrap)
      return unsub
    }
  }, [])

  useEffect(() => {
    const fallback = window.setTimeout(() => {
      if (!useAuthStore.getState().ready) {
        useAuthStore.setState({ ready: true })
      }
    }, 8000)
    return () => window.clearTimeout(fallback)
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return <>{children}</>
}
