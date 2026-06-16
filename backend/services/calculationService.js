export function calculateUtilization(allocatedHours, capacityHours) {
  if (!capacityHours || capacityHours <= 0) return 0;
  return Math.round((allocatedHours / capacityHours) * 100);
}

export function getUtilizationWarning(utilization) {
  if (utilization > 100) return { level: 'critical', message: 'Overallocated - exceeds 100% capacity' };
  if (utilization > 90) return { level: 'warning', message: 'Near capacity - above 90% utilization' };
  return { level: 'ok', message: 'Within capacity' };
}

export function calculatePlannedCost(estimatedHours, hourlyRate) {
  return Math.round(estimatedHours * hourlyRate * 100) / 100;
}

export function calculateActualCost(actualHours, hourlyRate) {
  return Math.round(actualHours * hourlyRate * 100) / 100;
}

export function getBudgetHealth(budget, actualCost) {
  const consumption = budget > 0 ? (actualCost / budget) * 100 : 0;
  const remaining = budget - actualCost;
  let status = 'green';
  if (actualCost > budget) status = 'red';
  else if (consumption >= 90) status = 'yellow';
  return { consumption: Math.round(consumption * 10) / 10, remaining, status };
}

export function calculateProfitability(revenue, cost) {
  const profit = revenue - cost;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;
  return { profit, margin };
}

export function calculateSkillMatch(employeeSkills, requiredSkills) {
  if (!requiredSkills || requiredSkills.length === 0) return 100;
  if (!employeeSkills || employeeSkills.length === 0) return 0;
  const matches = requiredSkills.filter((s) =>
    employeeSkills.some((es) => es.toLowerCase() === s.toLowerCase())
  );
  return Math.round((matches.length / requiredSkills.length) * 100);
}

export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekEnd(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function forecastCapacity(employee, tasks, weekStart) {
  const weekEnd = getWeekEnd(weekStart);
  const capacityHours = employee.capacityHours || 40;

  const weekTasks = tasks.filter((t) => {
    if (t.assigneeId !== employee.id) return false;
    if (t.status === 'Completed' || t.status === 'Cancelled') return false;
    const due = t.dueDate ? new Date(t.dueDate) : null;
    if (!due) return true;
    return due >= weekStart && due <= weekEnd;
  });

  const allocatedHours = weekTasks.reduce((sum, t) => {
    const remaining = Math.max(0, (t.estimatedHours || 0) - (t.actualHours || 0));
    return sum + remaining;
  }, 0);

  const availableHours = Math.max(0, capacityHours - allocatedHours);
  const utilization = calculateUtilization(allocatedHours, capacityHours);
  const warning = getUtilizationWarning(utilization);

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    capacityHours,
    allocatedHours,
    availableHours,
    utilization,
    warning,
    assignedTasks: weekTasks.map((t) => ({ id: t.id, title: t.title, hours: t.estimatedHours })),
  };
}

export function rankAssignees(employees, tasks, requiredSkills, weekStart) {
  return employees
    .filter((e) => e.status !== 'On Leave')
    .map((employee) => {
      const forecast = forecastCapacity(employee, tasks, weekStart);
      const skillMatch = calculateSkillMatch(employee.skills, requiredSkills);
      const score = skillMatch * 0.4 + (100 - forecast.utilization) * 0.4 + (forecast.availableHours / (employee.capacityHours || 40)) * 100 * 0.2;
      return {
        employee,
        skillMatch,
        utilization: forecast.utilization,
        availableHours: forecast.availableHours,
        forecast,
        score: Math.round(score),
        isBestMatch: false,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({ ...item, isBestMatch: index === 0 }));
}
