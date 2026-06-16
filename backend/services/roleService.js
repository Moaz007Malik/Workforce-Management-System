/** Normalize legacy role values from DB / JWT */
export function normalizeSystemRole(role) {
  if (!role || role === 'Manager') return 'Department Manager';
  if (role === 'HR Manager') return 'HR';
  return role;
}

export function isAdmin(role) {
  return normalizeSystemRole(role) === 'Admin';
}

export function isHR(role) {
  return normalizeSystemRole(role) === 'HR';
}

export function isDepartmentManager(role) {
  return normalizeSystemRole(role) === 'Department Manager';
}

export function isEmployee(role) {
  return normalizeSystemRole(role) === 'Employee';
}

export function canManageEmployees(role) {
  const r = normalizeSystemRole(role);
  return r === 'Admin' || r === 'HR';
}

export function canDeleteEmployees(role) {
  return isAdmin(role) || isHR(role);
}

export function canManageRoles(role) {
  return isAdmin(role);
}

export function canViewAllEmployees(role) {
  const r = normalizeSystemRole(role);
  return r === 'Admin' || r === 'HR' || r === 'Department Manager';
}

export function canManageAttendance(role) {
  const r = normalizeSystemRole(role);
  return r === 'Admin' || r === 'HR' || r === 'Department Manager';
}

export function canManagePerformance(role) {
  const r = normalizeSystemRole(role);
  return r === 'Admin' || r === 'HR' || r === 'Department Manager';
}

export function canManageAssignments(role) {
  const r = normalizeSystemRole(role);
  return r === 'Admin' || r === 'HR' || r === 'Department Manager';
}

/** Whether actor may view target employee record */
export function canViewEmployee(actor, target) {
  if (!actor || !target) return false;
  const role = normalizeSystemRole(actor.systemRole);
  if (role === 'Admin' || role === 'HR') return true;
  if (actor.sub === target.id || actor.id === target.id) return true;
  if (role === 'Department Manager') {
    const actorDept = actor.businessUnit || actor.department;
    const targetDept = target.businessUnit || target.department;
    if (actorDept && targetDept && actorDept === targetDept) return true;
    if (target.managerId && (target.managerId === actor.sub || target.managerId === actor.id)) return true;
  }
  return false;
}

export function filterEmployeesForActor(actor, employees) {
  const role = normalizeSystemRole(actor?.systemRole);
  if (role === 'Admin' || role === 'HR') return employees;
  if (role === 'Department Manager') {
    const dept = actor.businessUnit || actor.department;
    return employees.filter((e) => {
      if (e.id === actor.sub) return true;
      const eDept = e.businessUnit || e.department;
      return dept && eDept === dept;
    });
  }
  if (role === 'Employee') {
    return employees.filter((e) => e.id === actor.sub);
  }
  return employees;
}
