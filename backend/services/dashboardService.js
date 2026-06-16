import { repos } from '../repositories/index.js';
import {
  calculateProfitability,
  calculateUtilization,
} from './calculationService.js';
import { calculateAllProjectFinancials, getHourlyRate } from './projectCostService.js';

const projectRepo = repos.projects;
const employeeRepo = repos.employees;
const taskRepo = repos.tasks;
const timesheetRepo = repos.timesheets;
const budgetRepo = repos.budgets;

export async function getDashboardMetrics() {
  const [projects, employees, tasks, timesheets, budgets] = await Promise.all([
    projectRepo.getAll(),
    employeeRepo.getAll(),
    taskRepo.getAll(),
    timesheetRepo.getAll(),
    budgetRepo.getAll(),
  ]);

  const activeProjects = projects.filter((p) => p.status === 'Active');
  const completedProjects = projects.filter((p) => p.status === 'Completed');

  const availableResources = employees.filter((e) => e.status === 'Available').length;
  const allocatedResources = employees.filter(
    (e) => e.status === 'Allocated' || e.status === 'Fully Allocated'
  ).length;

  const projectCosts = calculateAllProjectFinancials(projects, tasks, timesheets, employees, budgets);

  const totalBudget = projectCosts.reduce((s, p) => s + p.budget, 0);
  const totalActualCost = projectCosts.reduce((s, p) => s + p.actualCost, 0);
  const totalPlannedCost = projectCosts.reduce((s, p) => s + p.plannedCost, 0);
  const totalRevenue = projectCosts.reduce((s, p) => s + p.revenue, 0);
  const budgetUtilization = totalBudget > 0 ? Math.round((totalActualCost / totalBudget) * 1000) / 10 : 0;

  const employeeUtilization = employees.map((emp) => {
    const activeTasks = tasks.filter(
      (t) => t.assigneeId === emp.id && t.status !== 'Completed' && t.status !== 'Cancelled'
    );
    const allocatedHours = activeTasks.reduce((s, t) => {
      const remaining = Math.max(0, (t.estimatedHours || 0) - (t.actualHours || 0));
      return s + remaining;
    }, 0);
    const capacityHours = emp.capacityHours || 40;
    const utilization = emp.utilization ?? calculateUtilization(allocatedHours, capacityHours);
    return {
      id: emp.id,
      name: emp.fullName,
      department: emp.department,
      utilization,
      allocatedHours,
      capacityHours,
    };
  });

  const monthlySpending = getMonthlySpending(timesheets, employees, 6);
  const monthlyTrend = getMonthlyCostTrend(monthlySpending);

  const projectStatusDistribution = [
    'Draft', 'Planned', 'Active', 'On Hold', 'Completed', 'Cancelled',
  ].map((status) => ({
    status,
    count: projects.filter((p) => p.status === status).length,
  }));

  const taskProgress = [
    'Not Started', 'In Progress', 'Review', 'Blocked', 'Completed',
  ].map((status) => ({
    status,
    count: tasks.filter((t) => t.status === status).length,
  }));

  const kanbanCounts = {
    Backlog: tasks.filter((t) => t.kanbanStatus === 'Backlog').length,
    'To Do': tasks.filter((t) => t.kanbanStatus === 'To Do').length,
    'In Progress': tasks.filter((t) => t.kanbanStatus === 'In Progress').length,
    Review: tasks.filter((t) => t.kanbanStatus === 'Review').length,
    Completed: tasks.filter((t) => t.kanbanStatus === 'Completed').length,
  };

  const overallProfit = calculateProfitability(totalRevenue, totalActualCost);
  const now = new Date();
  const countProjectsInMonth = (year, month) =>
    projects.filter((p) => {
      const d = new Date(p.createdAt || p.startDate);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length;
  const thisMonthCount = countProjectsInMonth(now.getFullYear(), now.getMonth());
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthCount = countProjectsInMonth(lastMonthDate.getFullYear(), lastMonthDate.getMonth());
  const projectGrowthTrend = lastMonthCount > 0
    ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 1000) / 10
    : thisMonthCount > 0 ? 100 : 0;

  return {
    kpis: {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      totalEmployees: employees.length,
      availableResources,
      allocatedResources,
      budgetUtilization,
      monthlyCost: monthlySpending[monthlySpending.length - 1]?.cost || 0,
      totalRevenue,
      totalActualCost,
      totalPlannedCost,
      totalBudget,
      profit: overallProfit.profit,
      profitMargin: overallProfit.margin,
      projectGrowthTrend,
      monthlyCostTrend: monthlyTrend,
      budgetUtilizationTrend: monthlyTrend,
    },
    projectStatusDistribution,
    budgetVsActual: projectCosts.map((p) => ({
      name: p.projectName,
      budget: p.budget,
      actual: p.actualCost,
      planned: p.plannedCost,
    })),
    resourceUtilization: employeeUtilization,
    monthlySpending,
    taskProgress,
    kanbanCounts,
    projectProfitability: projectCosts,
    employeeAllocation: employees.map((e) => {
      const util = employeeUtilization.find((u) => u.id === e.id);
      return {
        name: e.fullName.split(' ')[0],
        allocated: util?.allocatedHours || 0,
        available: Math.max(0, (e.capacityHours || 40) - (util?.allocatedHours || 0)),
      };
    }),
  };
}

function getMonthlySpending(timesheets, employees, months = 6) {
  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthTimesheets = timesheets.filter((ts) => {
      if (ts.status !== 'Approved') return false;
      const tsDate = new Date(ts.date);
      return `${tsDate.getFullYear()}-${String(tsDate.getMonth() + 1).padStart(2, '0')}` === monthKey;
    });
    const cost = monthTimesheets.reduce((sum, ts) => {
      const emp = employees.find((e) => e.id === ts.employeeId);
      return sum + (ts.hoursWorked || 0) * getHourlyRate(emp);
    }, 0);
    result.push({
      month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
      cost: Math.round(cost),
    });
  }
  return result;
}

function getMonthlyCostTrend(monthlySpending) {
  if (monthlySpending.length < 2) return 0;
  const current = monthlySpending[monthlySpending.length - 1]?.cost || 0;
  const previous = monthlySpending[monthlySpending.length - 2]?.cost || 0;
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
