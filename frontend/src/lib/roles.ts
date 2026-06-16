import type { Employee, SystemRole, PcpRole } from '@/types'
import { getPcpNavForRole, type PcpNavItem } from '@/lib/pcpNav'
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users, UserCircle,
  Clock, DollarSign, BarChart3, Settings, Building2, ClipboardCheck, Shield, History,
  Database, Bot,
} from 'lucide-react'

export function normalizeSystemRole(role?: string | null): SystemRole {
  if (!role || role === 'Manager') return 'Department Manager'
  if (role === 'HR Manager') return 'HR'
  if (role === 'Admin' || role === 'HR' || role === 'Department Manager' || role === 'Employee') {
    return role
  }
  return 'Employee'
}

const MANAGER_BLOCKED = ['/pcp/executive', '/pcp/insights']

function pathMatches(pathname: string, prefix: string): boolean {
  if (prefix === '/') return pathname === '/'
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function adminPath(pathname: string): boolean {
  const path = pathname.split('?')[0]
  return path === '/admin'
}

export function canManageEmployees(systemRole: SystemRole): boolean {
  const r = normalizeSystemRole(systemRole)
  return r === 'Admin' || r === 'HR'
}

export function canDeleteEmployees(systemRole: SystemRole): boolean {
  const r = normalizeSystemRole(systemRole)
  return r === 'Admin' || r === 'HR'
}

export function canManageRoles(systemRole: SystemRole): boolean {
  return normalizeSystemRole(systemRole) === 'Admin'
}

export function canViewEmployeeProfile(
  viewerRole: SystemRole,
  viewerId: string,
  viewerDept: string,
  target: Employee,
): boolean {
  const role = normalizeSystemRole(viewerRole)
  if (role === 'Admin' || role === 'HR') return true
  if (viewerId === target.id) return true
  if (role === 'Department Manager') {
    const dept = target.businessUnit || target.department
    if (viewerDept && dept === viewerDept) return true
    if (target.managerId === viewerId) return true
  }
  return false
}

export function canAccessRoute(systemRole: SystemRole, pathname: string, pcpRole?: PcpRole | null): boolean {
  const path = pathname.split('?')[0]
  const role = normalizeSystemRole(systemRole)

  if (adminPath(pathname)) {
    return canAccessAdmin(systemRole, pcpRole)
  }

  if (path === '/pcp/assistant') {
    return Boolean(pcpRole) || role === 'Admin'
  }

  if (path.startsWith('/pcp/requests/')) {
    return Boolean(pcpRole) || role === 'Admin' || role === 'HR'
  }

  if (path === '/pcp/new') {
    return pcpRole === 'Requester' || role === 'Admin'
  }

  if (path === '/pcp/approval') {
    return pcpRole === 'Approver' || pcpRole === 'Admin' || role === 'Admin'
  }

  if (path === '/pcp/executive' || path === '/pcp/insights') {
    return pcpRole === 'Executive' || role === 'Admin'
  }

  if (pathMatches(pathname, '/attendance')) return true

  if (role === 'Admin') return true

  if (role === 'HR') {
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

  if (role === 'Employee') {
    return (
      pathMatches(pathname, '/')
      || pathMatches(pathname, '/hr')
      || pathMatches(pathname, '/tasks')
      || pathMatches(pathname, '/projects')
      || pathMatches(pathname, '/attendance')
      || pathMatches(pathname, '/timesheets')
      || pathMatches(pathname, '/settings')
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

  if (role === 'Department Manager') {
    return (
      pathMatches(pathname, '/')
      || pathMatches(pathname, '/projects')
      || pathMatches(pathname, '/tasks')
      || pathMatches(pathname, '/resources')
      || pathMatches(pathname, '/hr')
      || pathMatches(pathname, '/timesheets')
      || pathMatches(pathname, '/reports')
      || pathMatches(pathname, '/settings')
      || pathMatches(pathname, '/attendance')
    )
  }

  return false
}

export function canAccessAuditLog(systemRole: SystemRole): boolean {
  return normalizeSystemRole(systemRole) === 'Admin'
}

export function canManagePcp(systemRole: SystemRole, pcpRole?: PcpRole | null): boolean {
  const role = normalizeSystemRole(systemRole)
  if (role === 'Admin') return true
  if (role === 'Department Manager' && pcpRole) return true
  return false
}

export function canCreatePcp(systemRole: SystemRole, pcpRole?: PcpRole | null): boolean {
  const role = normalizeSystemRole(systemRole)
  if (role === 'Admin') return true
  if (role === 'Department Manager' && (pcpRole === 'Requester' || pcpRole === 'Approver')) return true
  return false
}

export function isPcpAdminScope(systemRole: SystemRole, pcpRole?: PcpRole | null): boolean {
  return pcpRole === 'Admin' || normalizeSystemRole(systemRole) === 'Admin'
}

export function canViewOrgFinancials(systemRole: SystemRole, pcpRole?: PcpRole | null): boolean {
  if (pcpRole === 'Executive' || pcpRole === 'Admin') return true
  const role = normalizeSystemRole(systemRole)
  if (role === 'Admin' || role === 'HR') return true
  return false
}

export function canAccessAdmin(systemRole: SystemRole, pcpRole?: PcpRole | null): boolean {
  return pcpRole === 'Admin' || normalizeSystemRole(systemRole) === 'Admin'
}

export function canManageAttendance(systemRole: SystemRole, _pcpRole?: PcpRole | null): boolean {
  const role = normalizeSystemRole(systemRole)
  return role === 'Admin' || role === 'HR' || role === 'Department Manager'
}

export function canManagePerformance(systemRole: SystemRole): boolean {
  const role = normalizeSystemRole(systemRole)
  return role === 'Admin' || role === 'HR' || role === 'Department Manager'
}

export function canManageAssignments(systemRole: SystemRole): boolean {
  const role = normalizeSystemRole(systemRole)
  return role === 'Admin' || role === 'HR' || role === 'Department Manager'
}

const hrNav: PcpNavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hr', icon: UserCircle, label: 'Employees' },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/pcp/all', icon: Building2, label: 'PCPs' },
  { to: '/timesheets', icon: Clock, label: 'Timesheets' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

/** Admin sees all HR items plus full system and administration */
const adminNav: PcpNavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hr', icon: UserCircle, label: 'Employees' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/resources', icon: Users, label: 'Resources' },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/pcp/all', icon: Building2, label: 'PCPs' },
  { to: '/pcp/approval', icon: CheckSquare, label: 'Approval Queue' },
  { to: '/timesheets', icon: Clock, label: 'Timesheets' },
  { to: '/budgets', icon: DollarSign, label: 'Budgets' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/pcp/revisions', icon: History, label: 'Revision History' },
  { to: '/admin', icon: Shield, label: 'Administration' },
  { to: '/admin?tab=masters', icon: Database, label: 'Masters' },
  { to: '/pcp/assistant', icon: Bot, label: 'AI Assistant' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const employeeNav: PcpNavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hr', icon: UserCircle, label: 'My Profile' },
  { to: '/tasks', icon: CheckSquare, label: 'My Tasks' },
  { to: '/projects', icon: FolderKanban, label: 'My Projects' },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/timesheets', icon: Clock, label: 'Timesheets' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

const deptManagerNav: PcpNavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/resources', icon: Users, label: 'Resources' },
  { to: '/hr', icon: UserCircle, label: 'Team' },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
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
  const role = normalizeSystemRole(systemRole)
  if (role === 'Admin') return adminNav
  if (role === 'HR') return hrNav
  if (role === 'Employee') return employeeNav
  if (role === 'Department Manager' && !pcpRole) return deptManagerNav
  if (pcpRole) return getPcpNavForRole(pcpRole)
  return baseNav
}

export function filterNavByRole<T extends { to: string; disabled?: boolean }>(
  items: T[],
  systemRole: SystemRole,
  pcpRole?: PcpRole | null,
): T[] {
  return items.filter((item) => item.disabled || canAccessRoute(systemRole, item.to, pcpRole))
}

export function isEmployeeRole(systemRole: SystemRole): boolean {
  return normalizeSystemRole(systemRole) === 'Employee'
}

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  Admin: 'Admin',
  HR: 'HR Manager',
  'Department Manager': 'Department Manager',
  Employee: 'Employee',
}

export const SYSTEM_ROLES: SystemRole[] = ['Admin', 'HR', 'Department Manager', 'Employee']
