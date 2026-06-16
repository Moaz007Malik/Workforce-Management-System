import type { Employee, PcpRole, SystemRole } from '@/types'
import { normalizeSystemRole } from '@/lib/roles'

export function syncPcpFromEmployee(employee: Employee | undefined): {
  systemRole: SystemRole
  pcpRole: PcpRole | null
  businessUnit: string
} {
  if (!employee) {
    return { systemRole: 'Employee', pcpRole: null, businessUnit: '' }
  }
  return {
    systemRole: normalizeSystemRole(employee.systemRole),
    pcpRole: employee.pcpRole ?? null,
    businessUnit: employee.businessUnit || employee.department || '',
  }
}
