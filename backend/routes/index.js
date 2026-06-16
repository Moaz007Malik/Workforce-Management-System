import { Router } from 'express';
import { repos } from '../repositories/index.js';
import { logAudit, getAuditLogs } from '../services/auditService.js';
import {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../services/notificationService.js';
import { getDashboardMetrics } from '../services/dashboardService.js';
import { sendDashboardReportEmail } from '../services/emailService.js';
import {
  rankAssignees,
  forecastCapacity,
  getWeekStart,
} from '../services/calculationService.js';
import { calculateProjectFinancials } from '../services/projectCostService.js';
import { syncEmployee, syncEmployees, checkOverallocation } from '../services/employeeSyncService.js';
import {
  handleTimesheetStatusChange,
  validateTimesheet,
  syncBudgetRecord,
  syncTaskHoursFromTimesheets,
} from '../services/timesheetSyncService.js';
import { v4 as uuidv4 } from 'uuid';
import pcpRoutes from './pcp.js';
import authRoutes from './auth.js';
import chatRoutes from './chat.js';
import attendanceRoutes from './attendance.js';
import employeeRoutes from './employees.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { canViewEmployee, canManageEmployees } from '../services/roleService.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

async function deleteDocumentsForEntity(entityType, entityId) {
  const docs = await repos.documents.getAll();
  for (const doc of docs.filter((d) => d.entityType === entityType && d.entityId === entityId)) {
    await repos.documents.delete(doc.id);
  }
}

function stripDocumentContent(doc) {
  const { content, ...meta } = doc;
  return meta;
}

function sanitizeBody(body, extraStrip = []) {
  const { id, createdAt, updatedAt, ...rest } = body;
  extraStrip.forEach((k) => delete rest[k]);
  return rest;
}

function createCrudRoutes(name, repo, options = {}) {
  const r = Router();
  const serialize = options.serialize || ((item) => item);

  r.get('/', async (req, res) => {
    try {
      const items = await repo.getAll();
      res.json(items.map(serialize));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  r.get('/:id', async (req, res) => {
    try {
      const item = await repo.getById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Not found' });
      res.json(serialize(item));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  r.post('/', async (req, res) => {
    try {
      if (options.validate) {
        const errors = await options.validate(req.body);
        if (errors.length) return res.status(400).json({ error: errors.join('; ') });
      }
      const data = options.transformCreate ? options.transformCreate(req.body) : sanitizeBody(req.body);
      const item = {
        id: uuidv4(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await repo.create(item);
      await logAudit('CREATE', name, item.id, `${name} created: ${item.name || item.title || item.fullName || item.id}`);
      if (options.onCreate) await options.onCreate(item);
      res.status(201).json(serialize(item));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  r.put('/:id', async (req, res) => {
    try {
      const existing = await repo.getById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      if (options.validate) {
        const errors = await options.validate({ ...existing, ...req.body }, req.params.id);
        if (errors.length) return res.status(400).json({ error: errors.join('; ') });
      }
      const updates = sanitizeBody(req.body);
      const updated = await repo.update(req.params.id, updates);
      await logAudit('UPDATE', name, req.params.id, `${name} updated (${Object.keys(updates).join(', ')})`);
      if (options.onUpdate) await options.onUpdate(existing, updated);
      res.json(serialize(updated));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  r.delete('/:id', async (req, res) => {
    try {
      const existing = await repo.getById(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Not found' });
      if (options.onDelete) await options.onDelete(existing);
      await repo.delete(req.params.id);
      await logAudit('DELETE', name, req.params.id, `${name} deleted`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return r;
}

router.use('/employees', employeeRoutes);

router.use('/projects', createCrudRoutes('Project', repos.projects, {
  onCreate: async (project) => { await syncBudgetRecord(project.id); },
  onUpdate: async (old, updated) => {
    if (old.budget !== updated.budget) {
      await logAudit('BUDGET_CHANGE', 'Project', updated.id,
        `Project ${updated.name} budget changed from AED ${old.budget?.toLocaleString()} to AED ${updated.budget?.toLocaleString()}`);
      await createNotification('budget', 'Budget Updated',
        `Project ${updated.name} budget changed from AED ${old.budget?.toLocaleString()} to AED ${updated.budget?.toLocaleString()}`);
    }
    await syncBudgetRecord(updated.id);
  },
  onDelete: async (project) => {
    const related = ['tasks', 'timesheets', 'risks', 'issues', 'budgets'];
    for (const key of related) {
      const items = await repos[key].getAll();
      for (const item of items.filter((i) => i.projectId === project.id)) {
        await repos[key].delete(item.id);
      }
    }
    await deleteDocumentsForEntity('project', project.id);
  },
}));

router.use('/tasks', createCrudRoutes('Task', repos.tasks, {
  validate: async (data) => {
    const errors = [];
    if (!data.title?.trim()) errors.push('Title is required');
    if (!data.projectId) errors.push('Project is required');
    if (data.projectId && !(await repos.projects.getById(data.projectId))) {
      errors.push('Project not found');
    }
    if (data.assigneeId && !(await repos.employees.getById(data.assigneeId))) {
      errors.push('Assignee not found');
    }
    return errors;
  },
  transformCreate: (body) => ({
    ...sanitizeBody(body),
    kanbanStatus: body.kanbanStatus || 'Backlog',
    status: body.status || 'Not Started',
    estimatedHours: body.estimatedHours ?? 0,
    actualHours: body.actualHours ?? 0,
    priority: body.priority || 'Medium',
  }),
  onCreate: async (task) => {
    if (task.assigneeId) {
      await createNotification('task_assigned', 'New Task Assigned',
        `You have been assigned: ${task.title}`, task.assigneeId, { taskId: task.id });
      await syncEmployee(task.assigneeId);
      await checkOverallocation(task.assigneeId);
    }
    await syncBudgetRecord(task.projectId);
  },
  onUpdate: async (old, updated) => {
    if (old.assigneeId !== updated.assigneeId) {
      if (updated.assigneeId) {
        await createNotification('task_assigned', 'New Task Assigned',
          `You have been assigned: ${updated.title}`, updated.assigneeId, { taskId: updated.id });
        await syncEmployee(updated.assigneeId);
        await checkOverallocation(updated.assigneeId);
      }
      if (old.assigneeId) await syncEmployee(old.assigneeId);
    }
    if (updated.kanbanStatus !== old.kanbanStatus) {
      await logAudit('KANBAN_MOVE', 'Task', updated.id,
        `Task "${updated.title}" moved from ${old.kanbanStatus} to ${updated.kanbanStatus}`);
    }
    if (updated.dueDate && updated.status !== 'Completed') {
      const due = new Date(updated.dueDate);
      if (due < new Date() && updated.assigneeId) {
        await createNotification('task_overdue', 'Task Overdue',
          `${updated.title} is past its due date`, updated.assigneeId, { taskId: updated.id });
      }
    }
    await syncBudgetRecord(updated.projectId);
  },
  onDelete: async (task) => {
    const timesheets = await repos.timesheets.getAll();
    for (const ts of timesheets.filter((t) => t.taskId === task.id)) {
      await repos.timesheets.delete(ts.id);
    }
    if (task.assigneeId) await syncEmployee(task.assigneeId);
    await syncBudgetRecord(task.projectId);
  },
}));

router.use('/timesheets', createCrudRoutes('Timesheet', repos.timesheets, {
  validate: validateTimesheet,
  onCreate: async (ts) => {
    if (ts.status === 'Approved') {
      await syncTaskHoursFromTimesheets(ts.taskId);
      await syncEmployee(ts.employeeId);
      await syncBudgetRecord(ts.projectId);
    }
  },
  onUpdate: async (old, updated) => {
    await handleTimesheetStatusChange(old, updated);
    if (updated.status === 'Approved' && old.status !== 'Approved') {
      const emp = await repos.employees.getById(updated.employeeId);
      await createNotification('timesheet', 'Timesheet Approved',
        `Timesheet for ${updated.date} approved (${updated.hoursWorked}h)`, updated.employeeId);
    }
    await syncBudgetRecord(updated.projectId);
  },
  onDelete: async (ts) => {
    if (ts.taskId) await syncTaskHoursFromTimesheets(ts.taskId);
    if (ts.employeeId) await syncEmployee(ts.employeeId);
    if (ts.projectId) await syncBudgetRecord(ts.projectId);
  },
}));

router.use('/budgets', createCrudRoutes('Budget', repos.budgets, {
  onUpdate: async (old, updated) => {
    if (updated.projectId) {
      const project = await repos.projects.getById(updated.projectId);
      if (project && project.budget !== updated.amount) {
        await repos.projects.update(project.id, { budget: updated.amount });
        await syncBudgetRecord(project.id);
      }
    }
  },
}));

router.use('/departments', createCrudRoutes('Department', repos.departments));
router.use('/skills', createCrudRoutes('Skill', repos.skills));
router.use('/risks', createCrudRoutes('Risk', repos.risks, {
  validate: async (data) => {
    const errors = [];
    if (!data.risk?.trim()) errors.push('Risk description is required');
    if (!data.projectId) errors.push('Project is required');
    return errors;
  },
}));
router.use('/issues', createCrudRoutes('Issue', repos.issues, {
  validate: async (data) => {
    const errors = [];
    if (!data.issue?.trim()) errors.push('Issue description is required');
    if (!data.projectId) errors.push('Project is required');
    return errors;
  },
}));
router.use('/leaves', createCrudRoutes('Leave', repos.leaves, {
  validate: async (data) => {
    const errors = [];
    if (!data.employeeId) errors.push('Employee is required');
    if (!data.startDate || !data.endDate) errors.push('Start and end dates are required');
    return errors;
  },
  onUpdate: async (old, updated) => {
    if (old.status !== updated.status && updated.status === 'Approved') {
      await createNotification('leave', 'Leave Approved',
        `Your ${updated.type} request has been approved`, updated.employeeId);
    }
    await syncEmployee(updated.employeeId);
  },
  onDelete: async (leave) => { await syncEmployee(leave.employeeId); },
}));

router.use('/attendance', attendanceRoutes);

router.get('/dashboard', async (req, res) => {
  try {
    res.json(await getDashboardMetrics());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/dashboard/send-report', async (req, res) => {
  try {
    const { email, pdfBase64, fileName } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
    if (!pdfBase64) return res.status(400).json({ error: 'PDF data is required' });
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) return res.status(400).json({ error: 'Invalid email address' });
    const result = await sendDashboardReportEmail({ to: email, pdfBase64, fileName });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    res.json(await getNotifications(req.query.userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/notifications/read-all', async (req, res) => {
  try {
    await markAllAsRead(req.query.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const result = await markAsRead(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/audit-logs', async (req, res) => {
  try {
    res.json(await getAuditLogs(parseInt(req.query.limit) || 50));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/documents', optionalAuth, async (req, res) => {
  try {
    const { employeeId, projectId } = req.query;
    let docs = await repos.documents.getAll();
    if (employeeId) {
      if (!req.auth) return res.status(401).json({ error: 'Not authenticated' });
      const employee = await repos.employees.getById(employeeId);
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      if (!canViewEmployee(req.auth, employee)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      docs = docs.filter((d) => d.entityType === 'employee' && d.entityId === employeeId);
    } else if (projectId) {
      docs = docs.filter((d) => d.entityType === 'project' && d.entityId === projectId);
    }
    res.json(docs.map(stripDocumentContent));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/documents', requireAuth, async (req, res) => {
  try {
    const { entityType, entityId, title, fileName, mimeType, content } = req.body;
    if (!entityType || !entityId || !fileName || !content) {
      return res.status(400).json({ error: 'entityType, entityId, fileName, and content are required' });
    }
    if (!['employee', 'project'].includes(entityType)) {
      return res.status(400).json({ error: 'entityType must be employee or project' });
    }
    const entityRepo = entityType === 'employee' ? repos.employees : repos.projects;
    const entity = await entityRepo.getById(entityId);
    if (!entity) {
      return res.status(404).json({ error: `${entityType} not found` });
    }
    if (entityType === 'employee' && !canViewEmployee(req.auth, entity)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (entityType === 'employee' && !canManageEmployees(req.auth.systemRole) && req.auth.sub !== entityId) {
      return res.status(403).json({ error: 'Only Admin or HR can upload employee documents' });
    }
    const buffer = Buffer.from(content, 'base64');
    if (buffer.length > MAX_DOCUMENT_BYTES) {
      return res.status(400).json({ error: 'Document exceeds 5 MB limit' });
    }
    const doc = {
      id: uuidv4(),
      entityType,
      entityId,
      title: title?.trim() || fileName,
      fileName,
      mimeType: mimeType || 'application/octet-stream',
      size: buffer.length,
      content,
      uploadedAt: new Date().toISOString(),
    };
    await repos.documents.create(doc);
    await logAudit('CREATE', 'Document', doc.id, `Document uploaded: ${doc.title} (${entityType})`);
    res.status(201).json(stripDocumentContent(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/documents/:id/download', optionalAuth, async (req, res) => {
  try {
    const doc = await repos.documents.getById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (doc.entityType === 'employee') {
      if (!req.auth) return res.status(401).json({ error: 'Not authenticated' });
      const employee = await repos.employees.getById(doc.entityId);
      if (!employee || !canViewEmployee(req.auth, employee)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    const buffer = Buffer.from(doc.content, 'base64');
    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName.replace(/"/g, '')}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/documents/:id', requireAuth, async (req, res) => {
  try {
    const doc = await repos.documents.getById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (doc.entityType === 'employee') {
      const employee = await repos.employees.getById(doc.entityId);
      if (!employee || !canViewEmployee(req.auth, employee)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (!canManageEmployees(req.auth.systemRole)) {
        return res.status(403).json({ error: 'Only Admin or HR can delete employee documents' });
      }
    }
    await repos.documents.delete(req.params.id);
    await logAudit('DELETE', 'Document', req.params.id, `Document removed: ${doc.title}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/assignees/suggestions', async (req, res) => {
  try {
    const { skills, weekStart: ws, taskId } = req.query;
    let requiredSkills = skills ? skills.split(',').filter(Boolean) : [];
    if (taskId) {
      const task = await repos.tasks.getById(taskId);
      if (task?.requiredSkills?.length) requiredSkills = task.requiredSkills;
    }
    const weekStart = ws ? new Date(ws) : getWeekStart();
    const [employees, tasks] = await Promise.all([repos.employees.getAll(), repos.tasks.getAll()]);
    res.json(rankAssignees(employees, tasks, requiredSkills, weekStart));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/projects/:id/details', async (req, res) => {
  try {
    const project = await repos.projects.getById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    const [tasks, employees, risks, issues, budgets, timesheets] = await Promise.all([
      repos.tasks.getAll(),
      repos.employees.getAll(),
      repos.risks.getAll(),
      repos.issues.getAll(),
      repos.budgets.getAll(),
      repos.timesheets.getAll(),
    ]);
    const projectTasks = tasks.filter((t) => t.projectId === project.id);
    const budgetRecord = budgets.find((b) => b.projectId === project.id);
    const financials = calculateProjectFinancials(project, tasks, timesheets, employees, budgetRecord);
    const assignedEmployeeIds = [...new Set(projectTasks.map((t) => t.assigneeId).filter(Boolean))];
    const assignedResources = employees.filter((e) => assignedEmployeeIds.includes(e.id));
    const pcpRequests = await repos.pcpRequests.getAll();
    const pcps = pcpRequests
      .filter((r) => r.client === project.name)
      .map((r) => {
        const positions = r.positions || [];
        const monthlyTotal = r.monthlyTotal ?? positions.reduce((s, p) => s + (p.monthlyBudget || 0) * (p.count || 1), 0);
        const filled = positions.reduce((s, p) => s + (p.filled || 0), 0);
        const vacant = positions.reduce((s, p) => s + (p.vacant ?? Math.max(0, (p.count || 1) - (p.filled || 0))), 0);
        const posCount = positions.reduce((s, p) => s + (p.count || 1), 0);
        return {
          ...r,
          monthlyTotal,
          positionSummary: r.positionSummary || `${posCount} (${filled} filled / ${vacant} vacant)`,
        };
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

    res.json({
      project,
      tasks: projectTasks,
      assignedResources,
      wbs: buildWBS(project, projectTasks),
      risks: risks.filter((r) => r.projectId === project.id),
      issues: issues.filter((i) => i.projectId === project.id),
      budget: financials,
      progress: financials.progress,
      pcps,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildWBS(project, tasks) {
  const phases = project.phases || [{ id: 'default', name: 'Main Phase', milestones: [] }];
  return phases.map((phase) => ({
    ...phase,
    type: 'phase',
    milestones: (phase.milestones || []).map((ms) => ({
      ...ms,
      type: 'milestone',
      tasks: tasks.filter((t) => t.milestoneId === ms.id),
    })),
    tasks: tasks.filter((t) => t.phaseId === phase.id && !t.milestoneId),
  }));
}

router.get('/reports/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const metrics = await getDashboardMetrics();
    const employees = await repos.employees.getAll();
    const reports = {
      projects: { title: 'Projects Report', data: metrics.projectProfitability },
      resources: { title: 'Resource Utilization Report', data: metrics.resourceUtilization },
      budget: { title: 'Budget Report', data: metrics.budgetVsActual },
      employees: { title: 'Employees Report', data: employees },
      utilization: { title: 'Utilization Report', data: metrics.resourceUtilization },
      profitability: { title: 'Profitability Report', data: metrics.projectProfitability },
    };
    res.json(reports[type] || { title: 'Report', data: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync/employees', async (req, res) => {
  try {
    await syncEmployees((await repos.employees.getAll()).map((e) => e.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use('/pcp', pcpRoutes);

export default router;
