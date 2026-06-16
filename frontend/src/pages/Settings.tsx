import { useEffect, useState } from 'react'
import { Moon, Sun, Bell, Shield, LogOut, Palette, Check } from 'lucide-react'
import { COLOR_THEMES, type ColorThemeId } from '@/lib/themes'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/useAppStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { canAccessAuditLog, SYSTEM_ROLE_LABELS } from '@/lib/roles'
import { api } from '@/lib/api'
import type { AuditLog } from '@/types'
import { formatDistanceToNow } from 'date-fns'

const NOTIF_LABELS: Record<string, string> = {
  taskAssignments: 'Task assignments',
  budgetAlerts: 'Budget alerts',
  resourceOverallocation: 'Resource overallocation',
  leaveApprovals: 'Leave approvals',
  taskOverdue: 'Task overdue',
}

export function Settings() {
  const navigate = useNavigate()
  const {
    darkMode, colorTheme, setDarkMode, setColorTheme, notificationPrefs, toggleNotificationPref,
    systemRole, pcpRole, businessUnit,
  } = useAppStore()
  const { user, logout } = useAuthStore()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])

  useEffect(() => {
    api.get<AuditLog[]>('/audit-logs?limit=20').then(setAuditLogs)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Settings</h1>
        <p className="text-muted-foreground">Application preferences and audit trail</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Signed-in user and role-based access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1">
                <p className="font-medium">{user.fullName}</p>
                <p className="text-muted-foreground">{user.email}</p>
                <p><span className="text-muted-foreground">Department:</span> {user.department}</p>
                <p>
                  <span className="text-muted-foreground">System role:</span>{' '}
                  <span className="font-medium">{SYSTEM_ROLE_LABELS[systemRole]}</span>
                </p>
                {pcpRole ? (
                  <p>
                    <span className="text-muted-foreground">PCP workflow:</span>{' '}
                    <span className="font-medium text-primary">{pcpRole}</span>
                    {' · '}{businessUnit}
                  </p>
                ) : (
                  <p className="text-muted-foreground">No PCP workflow role</p>
                )}
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme Customization
            </CardTitle>
            <CardDescription>Choose a color theme and light or dark mode</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                {darkMode ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
                <span className="text-sm font-medium">Color mode</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={!darkMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDarkMode(false)}
                >
                  <Sun className="h-4 w-4" /> Light
                </Button>
                <Button
                  variant={darkMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDarkMode(true)}
                >
                  <Moon className="h-4 w-4" /> Dark
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium">Color theme</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {COLOR_THEMES.map((theme) => {
                  const selected = colorTheme === theme.id
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setColorTheme(theme.id as ColorThemeId)}
                      className={cn(
                        'relative rounded-xl border p-3 text-left transition-all',
                        selected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                          : 'border-border hover:border-primary/40',
                      )}
                    >
                      {selected && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      <div className="mb-2 flex gap-1">
                        {theme.swatch.map((color) => (
                          <span
                            key={color}
                            className="h-6 w-6 rounded-full border border-black/10 shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <p className="text-sm font-semibold">{theme.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{theme.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notifications</CardTitle>
            <CardDescription>Toggle notification categories (saved locally)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(notificationPrefs).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm">{NOTIF_LABELS[key] || key}</span>
                <button
                  onClick={() => toggleNotificationPref(key as keyof typeof notificationPrefs)}
                  className={`h-5 w-9 rounded-full relative transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}
                >
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${enabled ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {canAccessAuditLog(systemRole) && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Audit Log</CardTitle>
              <CardDescription>All major actions persisted to auditlogs.json</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{log.action[0]}</div>
                    <div className="flex-1">
                      <p className="font-medium">{log.details}</p>
                      <p className="text-xs text-muted-foreground">{log.action} · {log.entity} · {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
