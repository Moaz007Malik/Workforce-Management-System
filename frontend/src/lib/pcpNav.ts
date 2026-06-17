import {
  FilePlus, List, CheckSquare, History,
  BarChart3, Sparkles, Building2, LayoutDashboard, Bot, Shield, Database, ClipboardCheck, Clock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PcpRole } from '@/types'

export interface PcpNavItem {
  to: string
  icon: LucideIcon
  label: string
}

const workforceNav: PcpNavItem[] = [
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/timesheets', icon: Clock, label: 'Timesheets' },
]

export function getPcpNavForRole(role: PcpRole | null | undefined): PcpNavItem[] {
  if (!role) return []

  const assistant: PcpNavItem = { to: '/pcp/assistant', icon: Bot, label: 'AI Assistant' }

  switch (role) {
    case 'Requester':
      return [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        ...workforceNav,
        { to: '/pcp/new', icon: FilePlus, label: 'New PCP Request' },
        { to: '/pcp/requests', icon: List, label: 'My Requests' },
        { to: '/pcp/revisions', icon: History, label: 'Revision History' },
        assistant,
      ]
    case 'Approver':
      return [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        ...workforceNav,
        { to: '/pcp/approval', icon: CheckSquare, label: 'Approval Queue' },
        { to: '/pcp/requests', icon: List, label: 'My Requests' },
        { to: '/pcp/revisions', icon: History, label: 'Revision History' },
        assistant,
      ]
    case 'Admin':
      return [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        ...workforceNav,
        { to: '/admin', icon: Shield, label: 'Admin' },
        { to: '/admin?tab=masters', icon: Database, label: 'Masters' },
        { to: '/pcp/all', icon: Building2, label: 'All PCPs' },
        { to: '/pcp/approval', icon: CheckSquare, label: 'Approval Queue' },
        { to: '/pcp/revisions', icon: History, label: 'Revision History' },
        assistant,
      ]
    case 'Executive':
      return [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        ...workforceNav,
        { to: '/pcp/executive', icon: BarChart3, label: 'Executive Dashboard' },
        { to: '/pcp/insights', icon: Sparkles, label: 'AI Insights' },
        { to: '/pcp/all', icon: List, label: 'All PCPs' },
        assistant,
      ]
    default:
      return []
  }
}
