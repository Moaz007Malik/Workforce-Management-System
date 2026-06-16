import type { Employee, PcpRole, SystemRole } from '@/types'

export function syncPcpFromEmployee(employee: Employee | undefined): {
  systemRole: SystemRole
  pcpRole: PcpRole | null
  businessUnit: string
} {
  if (!employee) {
    return { systemRole: 'Manager', pcpRole: null, businessUnit: 'Construction – North' }
  }
  return {
    systemRole: employee.systemRole ?? 'Manager',
    pcpRole: employee.pcpRole ?? null,
    businessUnit: employee.businessUnit || employee.department || 'Construction – North',
  }
}
