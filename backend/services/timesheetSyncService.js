import { repos } from '../repositories/index.js';
import { getTaskActualHours } from './projectCostService.js';
import { syncEmployee, checkOverallocation } from './employeeSyncService.js';
import { createNotification } from './notificationService.js';
import { getBudgetHealth } from './calculationService.js';
import { calculateProjectFinancials } from './projectCostService.js';

const taskRepo = repos.tasks;
const timesheetRepo = repos.timesheets;
const projectRepo = repos.projects;
const employeeRepo = repos.employees;
const budgetRepo = repos.budgets;

export async function syncTaskHoursFromTimesheets(taskId) {
  const [task, timesheets] = await Promise.all([
    taskRepo.getById(taskId),
    timesheetRepo.getAll(),
  ]);
  if (!task) return null;

  const actualHours = timesheets
    .filter((ts) => ts.taskId === taskId && ts.status === 'Approved')
    .reduce((sum, ts) => sum + (ts.hoursWorked || 0), 0);

  return taskRepo.update(taskId, { actualHours });
}

export async function handleTimesheetStatusChange(oldTs, updatedTs) {
  if (!updatedTs.taskId) return;

  await syncTaskHoursFromTimesheets(updatedTs.taskId);
  await syncEmployee(updatedTs.employeeId);

  if (updatedTs.status === 'Approved' && oldTs.status !== 'Approved') {
    await checkBudgetAfterTimesheet(updatedTs);
  }
}

async function checkBudgetAfterTimesheet(timesheet) {
  const [project, tasks, timesheets, employees, budgets] = await Promise.all([
    projectRepo.getById(timesheet.projectId),
    taskRepo.getAll(),
    timesheetRepo.getAll(),
    employeeRepo.getAll(),
    budgetRepo.getAll(),
  ]);
  if (!project) return;

  const budgetRecord = budgets.find((b) => b.projectId === project.id);
  const { health, actualCost, budget } = calculateProjectFinancials(
    project, tasks, timesheets, employees, budgetRecord
  );

  if (health.status === 'red') {
    await createNotification('budget', 'Budget Exceeded',
      `Project ${project.name} has exceeded its budget (AED ${actualCost.toLocaleString()} / AED ${budget.toLocaleString()})`,
      'all', { projectId: project.id });
  } else if (health.status === 'yellow') {
    await createNotification('budget', 'Budget Warning',
      `Project ${project.name} is at ${health.consumption}% budget utilization`,
      'all', { projectId: project.id });
  }
}

export async function validateTimesheet(data, existingId = null) {
  const errors = [];
  if (!data.employeeId) errors.push('Employee is required');
  if (!data.projectId) errors.push('Project is required');
  if (!data.taskId) errors.push('Task is required');
  if (!data.date) errors.push('Date is required');
  if (!data.hoursWorked || data.hoursWorked <= 0) errors.push('Hours worked must be greater than 0');

  const task = data.taskId ? await taskRepo.getById(data.taskId) : null;
  if (task) {
    if (task.projectId !== data.projectId) {
      errors.push('Task does not belong to the selected project');
    }
    if (task.assigneeId && data.employeeId && task.assigneeId !== data.employeeId) {
      errors.push('Employee must match the task assignee');
    }
  }

  return errors;
}

export async function syncBudgetRecord(projectId) {
  const [project, tasks, timesheets, employees, budgets] = await Promise.all([
    projectRepo.getById(projectId),
    taskRepo.getAll(),
    timesheetRepo.getAll(),
    employeeRepo.getAll(),
    budgetRepo.getAll(),
  ]);
  if (!project) return;

  const budgetRecord = budgets.find((b) => b.projectId === projectId);
  const financials = calculateProjectFinancials(project, tasks, timesheets, employees, budgetRecord);

  if (budgetRecord) {
    await budgetRepo.update(budgetRecord.id, {
      amount: project.budget,
      plannedCost: financials.plannedCost,
      actualCost: financials.actualCost,
    });
  } else {
    await budgetRepo.create({
      id: `budget-${projectId}`,
      projectId,
      amount: project.budget || 0,
      plannedCost: financials.plannedCost,
      actualCost: financials.actualCost,
      currency: 'AED',
      fiscalYear: new Date().getFullYear(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
