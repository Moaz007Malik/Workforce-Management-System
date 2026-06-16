import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Briefcase, Plus, Pencil, ListTodo, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmployeeFormDialog } from '@/components/forms/EmployeeFormDialog'
import { LeaveFormDialog } from '@/components/forms/LeaveFormDialog'
import { useEmployeeStore } from '@/stores/useEmployeeStore'
import { useEffectiveRoles } from '@/lib/useEffectiveRoles'
import {
  canManageEmployees,
  canDeleteEmployees,
  normalizeSystemRole,
  SYSTEM_ROLE_LABELS,
} from '@/lib/roles'
import { cn, formatCurrency, getStatusColor } from '@/lib/utils'
import type { Employee } from '@/types'

export function HR() {
  const navigate = useNavigate()
  const { employees, loading, fetchEmployees, deleteEmployee } = useEmployeeStore()
  const { systemRole, currentUserId, user } = useEffectiveRoles()
  const role = normalizeSystemRole(systemRole)
  const [formOpen, setFormOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    void fetchEmployees()
  }, [fetchEmployees])

  useEffect(() => {
    if (!loading && role === 'Employee' && user?.id) {
      navigate(`/hr/${user.id}`, { replace: true })
    }
  }, [loading, role, user?.id, navigate])

  const handleDelete = async (e: React.MouseEvent, emp: Employee) => {
    e.stopPropagation()
    if (!canDeleteEmployees(systemRole)) return
    if (emp.id === currentUserId) return
    if (!window.confirm(`Remove ${emp.fullName} from the system? This cannot be undone.`)) return
    setDeletingId(emp.id)
    try {
      await deleteEmployee(emp.id)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
  }

  if (role === 'Employee') {
    return <Skeleton className="h-48" />
  }

  const title = role === 'Department Manager' ? 'My Team' : 'Employees'
  const subtitle = role === 'Department Manager'
    ? 'View and manage your department team members'
    : 'Manage employees, documents, attendance, and performance'

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLeaveOpen(true)}>Request Leave</Button>
          {canManageEmployees(systemRole) && (
            <Button onClick={() => { setEditEmployee(null); setFormOpen(true) }}>
              <Plus className="h-4 w-4" /> Add Employee
            </Button>
          )}
        </div>
      </div>

      {employees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No employees found. {canManageEmployees(systemRole) ? 'Add your first employee to get started.' : ''}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => (
            <Card key={emp.id} className="cursor-pointer" onClick={() => navigate(`/hr/${emp.id}`)}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                      {emp.fullName.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-semibold">{emp.fullName}</h3>
                      <p className="text-sm text-muted-foreground">{emp.designation}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', getStatusColor(emp.status))}>{emp.status}</span>
                    <div className="flex gap-0.5">
                      {canManageEmployees(systemRole) && (
                        <Button variant="ghost" size="icon" className="action-icon-btn" onClick={(e) => { e.stopPropagation(); setEditEmployee(emp); setFormOpen(true) }}>
                          <Pencil />
                        </Button>
                      )}
                      {canDeleteEmployees(systemRole) && emp.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="action-icon-btn text-destructive"
                          disabled={deletingId === emp.id}
                          onClick={(e) => handleDelete(e, emp)}
                        >
                          <Trash2 />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{emp.email}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Briefcase className="h-3 w-3" />{emp.department}</div>
                <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-[10px]">
                  {SYSTEM_ROLE_LABELS[normalizeSystemRole(emp.systemRole)]}
                </Badge>
                {emp.pcpRole && (
                  <Badge variant="secondary" className="text-[10px]">PCP: {emp.pcpRole}</Badge>
                )}
                {emp.active === false && (
                  <Badge variant="outline" className="text-[10px] text-destructive">Inactive</Badge>
                )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {(emp.skills?.length ? emp.skills : ['No skills']).slice(0, 4).map((s) => (
                    <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">{formatCurrency(emp.hourlyRate)}/hr</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={(e) => { e.stopPropagation(); navigate(`/hr/${emp.id}`) }}
                  >
                    <ListTodo className="h-3 w-3" /> View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EmployeeFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => fetchEmployees()} employee={editEmployee} />
      <LeaveFormDialog open={leaveOpen} onClose={() => setLeaveOpen(false)} onSaved={() => fetchEmployees()} employees={employees} />
    </div>
  )
}
