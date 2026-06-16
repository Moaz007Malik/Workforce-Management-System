import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { filterNavByRole, getPcpNavForUser } from '@/lib/roles'
import { useEffectiveRoles } from '@/lib/useEffectiveRoles'
import { useAppStore } from '@/stores/useAppStore'
import { useAuthStore } from '@/stores/useAuthStore'

interface NavItem {
  to: string
  icon: LucideIcon
  label: string
  disabled?: boolean
}

const trailingNavItems: NavItem[] = []

function navIsActive(pathname: string, search: string, to: string): boolean {
  const [toPath, toQuery] = to.split('?')
  if (toPath === '/') return pathname === '/'
  if (pathname !== toPath) return false
  if (toQuery) return search.includes(toQuery)
  if (toPath === '/admin') return !search.includes('tab=')
  return true
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const { systemRole, pcpRole } = useEffectiveRoles()
  const location = useLocation()

  const navItems: NavItem[] = filterNavByRole(
    [...getPcpNavForUser(systemRole, pcpRole), ...trailingNavItems],
    systemRole,
    pcpRole,
  )

  const navReady = !token || Boolean(user)

  const closeDrawer = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-50 flex h-screen h-dvh flex-col border-r border-border bg-card shadow-xl backdrop-blur-xl transition-transform duration-300 lg:shadow-none',
        'w-[min(280px,88vw)]',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
        sidebarOpen ? 'lg:w-64' : 'lg:w-[72px]',
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3 sm:h-16 sm:px-4">
        <img src="/logo.png" alt="Descon" className="h-8 w-8 shrink-0 rounded-lg object-contain sm:h-9 sm:w-9" />
        <div
          className={cn(
            'min-w-0 flex-1',
            !sidebarOpen && 'lg:hidden',
          )}
        >
          <h1 className="truncate text-sm font-bold tracking-tight">Descon</h1>
          <p className="truncate text-[10px] text-muted-foreground">Personnel Cost Planning</p>
          {pcpRole && (
            <p className="truncate text-[10px] font-medium text-primary">{pcpRole} view</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain p-2 sm:p-3">
        {!navReady && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {navReady && navItems.map((item) =>
          item.disabled ? (
            <span
              key={item.to}
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/50 opacity-60"
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className={cn('leading-tight', !sidebarOpen && 'lg:hidden')}>{item.label}</span>
            </span>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={closeDrawer}
              title={!sidebarOpen ? item.label : undefined}
              className={() =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  navIsActive(location.pathname, location.search, item.to)
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className={cn('leading-tight', !sidebarOpen && 'lg:hidden')}>{item.label}</span>
            </NavLink>
          ),
        )}
      </nav>

      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="m-2 hidden items-center justify-center rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:m-3 lg:flex"
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <ChevronLeft className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')} />
      </button>
    </aside>
  )
}
