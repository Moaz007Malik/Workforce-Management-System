import {
  calculatePlannedCost,
  calculateActualCost,
  getBudgetHealth,
  calculateProfitability,
} from './calculationService.js';

export function getHourlyRate(employee) {
  return employee?.hourlyRate ?? 0;
}

export function getTaskActualHours(task, timesheets) {
  const approvedHours = timesheets
    .filter((ts) => ts.taskId === task.id && ts.status === 'Approved')
    .reduce((sum, ts) => sum + (ts.hoursWorked || 0), 0);
  return Math.max(task.actualHours || 0, approvedHours);
}

export function calculateProjectFinancials(project, tasks, timesheets, employees, budgetRecord) {
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  let plannedCost = 0;
  let actualCost = 0;

  projectTasks.forEach((task) => {
    const assignee = employees.find((e) => e.id === task.assigneeId);
    const rate = getHourlyRate(assignee);
    plannedCost += calculatePlannedCost(task.estimatedHours || 0, rate);
    const actualHours = getTaskActualHours(task, timesheets);
    actualCost += calculateActualCost(actualHours, rate);
  });

  const budget = project.budget ?? budgetRecord?.amount ?? 0;
  const revenue = project.revenue || 0;
  const health = getBudgetHealth(budget, actualCost);
  const profitability = calculateProfitability(revenue, actualCost);

  return {
    budget,
    plannedCost: Math.round(plannedCost * 100) / 100,
    actualCost: Math.round(actualCost * 100) / 100,
    remaining: Math.round((budget - actualCost) * 100) / 100,
    health,
    profitability,
    completedTasks: projectTasks.filter((t) => t.status === 'Completed').length,
    totalTasks: projectTasks.length,
    progress: projectTasks.length
      ? Math.round((projectTasks.filter((t) => t.status === 'Completed').length / projectTasks.length) * 100)
      : 0,
  };
}

export function calculateAllProjectFinancials(projects, tasks, timesheets, employees, budgets) {
  return projects.map((project) => {
    const budgetRecord = budgets.find((b) => b.projectId === project.id);
    const financials = calculateProjectFinancials(project, tasks, timesheets, employees, budgetRecord);
    return {
      projectId: project.id,
      projectName: project.name,
      ...financials,
      consumption: financials.health.consumption,
      health: financials.health.status,
      revenue: project.revenue || 0,
      profit: financials.profitability.profit,
      margin: financials.profitability.margin,
    };
  });
}
