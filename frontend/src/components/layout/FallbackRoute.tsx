import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'

export function FallbackRoute() {
  const token = useAuthStore((s) => s.token)
  return <Navigate to={token ? '/' : '/login'} replace />
}
