import { useMemo } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAppStore } from '@/stores/useAppStore'
import { syncPcpFromEmployee } from '@/lib/userContext'

/** Auth user is source of truth — avoids stale persisted roles breaking menus and /admin access */
export function useEffectiveRoles() {
  const user = useAuthStore((s) => s.user)
  const storedSystemRole = useAppStore((s) => s.systemRole)
  const storedPcpRole = useAppStore((s) => s.pcpRole)
  const storedBusinessUnit = useAppStore((s) => s.businessUnit)
  const storedCurrentUserId = useAppStore((s) => s.currentUserId)

  return useMemo(() => {
    if (user) {
      const synced = syncPcpFromEmployee(user)
      return {
        systemRole: synced.systemRole,
        pcpRole: synced.pcpRole,
        businessUnit: synced.businessUnit,
        currentUserId: user.id,
        user,
      }
    }

    return {
      systemRole: storedSystemRole,
      pcpRole: storedPcpRole,
      businessUnit: storedBusinessUnit,
      currentUserId: storedCurrentUserId,
      user: null,
    }
  }, [user, storedSystemRole, storedPcpRole, storedBusinessUnit, storedCurrentUserId])
}
