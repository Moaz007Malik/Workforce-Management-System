import type { SystemRole, PcpRole } from '@/types'
import { getPcpNavForRole, type PcpNavItem } from '@/lib/pcpNav'
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users, UserCircle,
  Clock, DollarSign, BarChart3, Settings, Building2, ClipboardCheck,
} from 'lucide-react'

const MANAGER_BLOCKED = ['/pcp/executive', '/pcp/insights']

function pathMatches(pathname: string, prefix: string): boolean {
  if (prefix === '/') return pathname === '/'
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function adminPath(pathname: string): boolean {
  const path = pathname.split('?')[0]
  return path === '/admin'
}

export function canAccessRoute(systemRole: SystemRole, pathname: string, pcpRole?: PcpRole | null): boolean {
  const path = pathname.split('?')[0]

  if (adminPath(pathname)) {
    return canAccessAdmin(systemRole, pcpRole)
  }

  if (path === '/pcp/assistant') {
    return Boolean(pcpRole) || systemRole === 'Admin'
  }

  if (path.startsWith('/pcp/requests/')) {
    return Boolean(pcpRole) || systemRole === 'Admin' || systemRole === 'HR'
  }

  if (path === '/pcp/new') {
    return pcpRole === 'Requester' || systemRole === 'Admin'
  }

  if (path === '/pcp/approval') {
    return pcpRole === 'Approver' || pcpRole === 'Admin' || systemRole === 'Admin'
  }

  if (path === '/pcp/executive' || path === '/pcp/insights') {
    return pcpRole === 'Executive' || systemRole === 'Admin'
  }

  if (pathMatches(pathname, '/attendance')) {
    return true
  }

  if (systemRole === 'Admin') return true

  if (systemRole === 'HR') {
    return (
      pathMatches(pathname, '/')
      || pathMatches(pathname, '/hr')
      || pathMatches(pathname, '/attendance')
      || pathMatches(pathname, '/timesheets')
      || pathMatches(pathname, '/reports')
      || pathMatches(pathname, '/settings')
      || pathMatches(pathname, '/pcp/all')
      || pathMatches(pathname, '/pcp/requests')
    )
  }

  if (pcpRole) {
    const allowed = getPcpNavForRole(pcpRole).map((item) => item.to.split('?')[0])
    if (allowed.includes(path)) return true
    if (path === '/pcp/requests' || path.startsWith('/pcp/requests/')) return true
    if (path === '/pcp/all' && (pcpRole === 'Admin' || pcpRole === 'Executive')) return true
    if (pathMatches(pathname, '/settings')) return true
    return false
  }

  if (MANAGER_BLOCKED.some((p) => pathMatches(pathname, p))) return false

  return (
    pathMatches(pathname, '/')
    || pathMatches(pathname, '/projects')
    || pathMatches(pathname, '/tasks')
    || pathMatches(pathname, '/resources')
    || pathMatches(pathname, '/hr')
    || pathMatches(pathname, '/timesheets')
    || pathMatches(pathname, '/budgets')
    || pathMatches(pathname, '/reports')
    || pathMatches(pathname, '/settings')
    || pathMatches(pathname, '/attendance')
    || pathMatches(pathname, '/pcp')
  )
}

export function canAccessAuditLog(systemRole: SystemRole): boolean {
  return systemRole === 'Admin'
}

export function canManagePcp(systemRole: SystemRole, pcpRole?: PcpRole | null): boolean {
  if (systemRole === 'Admin') return true
  if (systemRole === 'Manager' && pcpRole) return true
  return false
}

export function canCreatePcp(systemRole: SystemRole, pcpRole?: PcpRole | null): boolean {
  if (systemRole === 'Admin') return true
  if (systemRole === 'Manager' && (pcpRole === 'Requester' || pcpRole === 'Approver')) return true
  return false
}

export function isPcpAdminScope(systemRole: SystemRole, pcpRole?: PcpRole | null): boolean {
  return pcpRole === 'Admin' || systemRole === 'Admin'
}

/** Org-wide financial KPIs — not for Requester / Approver */
export function canViewOrgFinancials(systemRole: SystemRole, pcpRole?: PcpRole | null): boolean {
  if (pcpRole === 'Executive' || pcpRole === 'Admin') return true
  if (systemRole === 'Admin' || systemRole === 'HR') return true
  return false
}

export function canAccessAdmin(systemRole: SystemRole, pcpRole?: PcpRole | null): boolean {
  return pcpRole === 'Admin' || systemRole === 'Admin'
}

/** Mark, edit, and accept attendance — Admin and HR only */
export function canManageAttendance(systemRole: SystemRole, _pcpRole?: PcpRole | null): boolean {
  return systemRole === 'Admin' || systemRole === 'HR'
}

const hrNav: PcpNavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hr', icon: UserCircle, label: 'HR' },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/pcp/all', icon: Building2, label: 'PCPs' },
  { to: '/timesheets', icon: Clock, label: 'Timesheets' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const baseNav: PcpNavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/resources', icon: Users, label: 'Resources' },
  { to: '/hr', icon: UserCircle, label: 'HR' },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/timesheets', icon: Clock, label: 'Timesheets' },
  { to: '/budgets', icon: DollarSign, label: 'Budgets' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function getPcpNavForUser(systemRole: SystemRole, pcpRole?: PcpRole | null): PcpNavItem[] {
  if (systemRole === 'HR') return hrNav
  if (pcpRole) return getPcpNavForRole(pcpRole)
  if (systemRole === 'Admin') return getPcpNavForRole('Admin')
  return baseNav
}

export function filterNavByRole<T extends { to: string; disabled?: boolean }>(
  items: T[],
  systemRole: SystemRole,
  pcpRole?: PcpRole | null,
): T[] {
  return items.filter((item) => item.disabled || canAccessRoute(systemRole, item.to, pcpRole))
}

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  Admin: 'Admin',
  HR: 'HR',
  Manager: 'Manager',
}
