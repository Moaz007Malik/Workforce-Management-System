import { repos } from '../repositories/index.js';
import { calculateUtilization } from './calculationService.js';
import { createNotification } from './notificationService.js';

const employeeRepo = repos.employees;
const taskRepo = repos.tasks;
const leaveRepo = repos.leaves;

function isActiveLeave(leave, today = new Date()) {
  if (leave.status !== 'Approved') return false;
  const start = new Date(leave.startDate);
  const end = new Date(leave.endDate);
  end.setHours(23, 59, 59, 999);
  return today >= start && today <= end;
}

export async function syncEmployee(employeeId) {
  const employee = await employeeRepo.getById(employeeId);
  if (!employee) return null;

  const [tasks, leaves] = await Promise.all([taskRepo.getAll(), leaveRepo.getAll()]);
  const empLeaves = leaves.filter((l) => l.employeeId === employeeId);
  const onLeave = empLeaves.some((l) => isActiveLeave(l));

  if (onLeave) {
    return employeeRepo.update(employeeId, {
      status: 'On Leave',
      availability: 0,
      utilization: 0,
    });
  }

  const activeTasks = tasks.filter(
    (t) => t.assigneeId === employeeId && t.status !== 'Completed' && t.status !== 'Cancelled'
  );
  const allocatedHours = activeTasks.reduce((sum, t) => {
    const remaining = Math.max(0, (t.estimatedHours || 0) - (t.actualHours || 0));
    return sum + remaining;
  }, 0);

  const capacityHours = employee.capacityHours || 40;
  const utilization = calculateUtilization(allocatedHours, capacityHours);
  const availability = Math.max(0, capacityHours - allocatedHours);

  let status = 'Available';
  if (utilization >= 100) status = 'Fully Allocated';
  else if (utilization > 0) status = 'Allocated';

  return employeeRepo.update(employeeId, { status, availability, utilization, allocatedHours });
}

export async function syncEmployees(employeeIds) {
  const unique = [...new Set(employeeIds.filter(Boolean))];
  await Promise.all(unique.map((id) => syncEmployee(id)));
}

export async function syncAllEmployees() {
  const employees = await employeeRepo.getAll();
  await Promise.all(employees.map((e) => syncEmployee(e.id)));
}

export async function checkOverallocation(employeeId) {
  const employee = await employeeRepo.getById(employeeId);
  if (!employee || employee.utilization <= 90) return;

  await createNotification(
    'resource',
    employee.utilization > 100 ? 'Resource Overallocated' : 'Near Capacity Warning',
    `${employee.fullName} is at ${employee.utilization}% utilization`,
    'all',
    { employeeId }
  );
}
