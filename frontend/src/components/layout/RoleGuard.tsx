import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { canAccessRoute, canAccessAdmin } from '@/lib/roles'
import { useEffectiveRoles } from '@/lib/useEffectiveRoles'

export function RoleGuard() {
  const { pathname, search } = useLocation()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const { systemRole, pcpRole } = useEffectiveRoles()
  const fullPath = `${pathname}${search}`
  const path = pathname.split('?')[0]

  // Wait until profile is loaded — prevents /admin redirect to dashboard on stale defaults
  if (token && !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!canAccessRoute(systemRole, fullPath, pcpRole)) {
    if (pcpRole === 'Executive') return <Navigate to="/pcp/executive" replace />
    if (canAccessAdmin(systemRole, pcpRole) && path !== '/admin') {
      return <Navigate to="/admin" replace />
    }
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
