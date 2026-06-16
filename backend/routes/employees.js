import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { repos } from '../repositories/index.js';
import { logAudit } from '../services/auditService.js';
import { syncEmployee } from '../services/employeeSyncService.js';
import {
  forecastCapacity,
  getWeekStart,
} from '../services/calculationService.js';
import {
  sanitizeEmployee,
  hashPassword,
  defaultPasswordForEmployee,
} from '../services/authService.js';
import {
  canManageEmployees,
  canDeleteEmployees,
  canViewEmployee,
  filterEmployeesForActor,
  canManagePerformance,
  canManageAssignments,
  normalizeSystemRole,
} from '../services/roleService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

async function deleteDocumentsForEntity(entityType, entityId) {
  const docs = await repos.documents.getAll();
  for (const doc of docs.filter((d) => d.entityType === entityType && d.entityId === entityId)) {
    await repos.documents.delete(doc.id);
  }
}

function sanitizeBody(body, extraStrip = []) {
  const { id, createdAt, updatedAt, passwordHash, ...rest } = body;
  extraStrip.forEach((k) => delete rest[k]);
  return rest;
}

function validateEmployeeData(data) {
  const errors = [];
  if (!data.fullName?.trim()) errors.push('Full name is required');
  if (!data.email?.trim()) errors.push('Email is required');
  if (!data.department) errors.push('Department is required');
  if (!data.designation?.trim()) errors.push('Designation is required');
  const skills = Array.isArray(data.skills) ? data.skills.filter(Boolean) : [];
  if (skills.length === 0) errors.push('At least one skill is required');
  const role = normalizeSystemRole(data.systemRole);
  if (!['Admin', 'HR', 'Department Manager', 'Employee'].includes(role)) {
    errors.push('Invalid system role');
  }
  return errors;
}

async function getActorEmployee(auth) {
  return repos.employees.getById(auth.sub);
}

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const employees = await repos.employees.getAll();
    const filtered = filterEmployeesForActor(req.auth, employees);
    res.json(filtered.map(sanitizeEmployee));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/capacity', async (req, res) => {
  try {
    const employee = await repos.employees.getById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (!canViewEmployee(req.auth, employee)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const weekStart = req.query.weekStart ? new Date(req.query.weekStart) : getWeekStart();
    const tasks = await repos.tasks.getAll();
    res.json(forecastCapacity(employee, tasks, weekStart));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/profile', async (req, res) => {
  try {
    const employee = await repos.employees.getById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Not found' });
    if (!canViewEmployee(req.auth, employee)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const [tasks, projects, timesheets, leaves, attendance, performanceReviews, workAssignments, documents] =
      await Promise.all([
        repos.tasks.getAll(),
        repos.projects.getAll(),
        repos.timesheets.getAll(),
        repos.leaves.getAll(),
        repos.attendance.getAll(),
        repos.performanceReviews.getAll(),
        repos.workAssignments.getAll(),
        repos.documents.getAll(),
      ]);
    const empTasks = tasks.filter((t) => t.assigneeId === employee.id);
    const projectIds = [...new Set(empTasks.map((t) => t.projectId))];
    const assignedProjects = projects.filter((p) => projectIds.includes(p.id));
    const allocatedHours = empTasks
      .filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled')
      .reduce((s, t) => s + Math.max(0, (t.estimatedHours || 0) - (t.actualHours || 0)), 0);
    const weekStart = getWeekStart();
    const forecast = forecastCapacity(employee, tasks, weekStart);
    res.json({
      employee: sanitizeEmployee(employee),
      assignedProjects,
      assignedTasks: empTasks,
      timesheets: timesheets.filter((t) => t.employeeId === employee.id),
      leaves: leaves.filter((l) => l.employeeId === employee.id),
      attendance: attendance
        .filter((a) => a.employeeId === employee.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
      performanceReviews: performanceReviews
        .filter((r) => r.employeeId === employee.id)
        .sort((a, b) => (b.reviewDate || '').localeCompare(a.reviewDate || '')),
      workAssignments: workAssignments
        .filter((a) => a.employeeId === employee.id)
        .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')),
      documentCount: documents.filter((d) => d.entityType === 'employee' && d.entityId === employee.id).length,
      allocatedHours,
      utilization: employee.utilization ?? forecast.utilization,
      forecast,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const employee = await repos.employees.getById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Not found' });
    if (!canViewEmployee(req.auth, employee)) {
      return res.status(403).json({ error: 'You cannot view this employee' });
    }
    res.json(sanitizeEmployee(employee));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!canManageEmployees(req.auth.systemRole)) {
      return res.status(403).json({ error: 'Only Admin or HR Manager can add employees' });
    }
    const data = sanitizeBody(req.body);
    const errors = validateEmployeeData(data);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const skills = data.skills.map((s) => String(s).trim()).filter(Boolean);
    const systemRole = normalizeSystemRole(data.systemRole || 'Employee');
    if (systemRole === 'Admin' && req.auth.systemRole !== 'Admin') {
      return res.status(403).json({ error: 'Only Admin can create Admin users' });
    }

    const item = {
      id: uuidv4(),
      employeeId: data.employeeId || `EMP${String(Date.now()).slice(-6)}`,
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      department: data.department,
      businessUnit: data.businessUnit || data.department,
      designation: data.designation.trim(),
      skills,
      hourlyRate: Number(data.hourlyRate) || 0,
      monthlySalary: Number(data.monthlySalary) || 0,
      capacityHours: Number(data.capacityHours) || 40,
      status: 'Available',
      systemRole,
      pcpRole: data.pcpRole || null,
      managerId: data.managerId || null,
      active: data.active !== false,
      onLeave: Boolean(data.onLeave),
      approvalDelegateId: data.approvalDelegateId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const plainPassword = req.body.password?.trim();
    if (plainPassword) {
      if (plainPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      item.passwordHash = await hashPassword(plainPassword);
    } else {
      item.passwordHash = await hashPassword(defaultPasswordForEmployee(item));
    }

    await repos.employees.create(item);
    await syncEmployee(item.id);
    await logAudit('CREATE', 'Employee', item.id, `Employee created: ${item.fullName}`);
    res.status(201).json(sanitizeEmployee(item));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const existing = await repos.employees.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const isSelf = req.auth.sub === existing.id;
    const canManage = canManageEmployees(req.auth.systemRole);

    if (!canManage && !isSelf) {
      return res.status(403).json({ error: 'You cannot edit this employee' });
    }

    const updates = sanitizeBody(req.body);
    if (!canManage) {
      delete updates.systemRole;
      delete updates.pcpRole;
      delete updates.managerId;
      delete updates.hourlyRate;
      delete updates.monthlySalary;
      delete updates.active;
      delete updates.onLeave;
      delete updates.approvalDelegateId;
      delete updates.password;
      delete updates.employeeId;
    }

    if (canManage && updates.password !== undefined) {
      const plainPassword = String(updates.password || '').trim();
      delete updates.password;
      if (plainPassword) {
        if (plainPassword.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        updates.passwordHash = await hashPassword(plainPassword);
      }
    }

    if (canManage && updates.onLeave !== undefined) {
      updates.onLeave = Boolean(updates.onLeave);
    }
    if (canManage && updates.approvalDelegateId !== undefined) {
      updates.approvalDelegateId = updates.approvalDelegateId || null;
    }

    if (updates.systemRole) {
      updates.systemRole = normalizeSystemRole(updates.systemRole);
      if (updates.systemRole === 'Admin' && req.auth.systemRole !== 'Admin') {
        return res.status(403).json({ error: 'Only Admin can assign Admin role' });
      }
    }

    const merged = { ...existing, ...updates };
    const errors = validateEmployeeData(merged);
    if (errors.length) return res.status(400).json({ error: errors.join('; ') });

    const updated = await repos.employees.update(req.params.id, {
      ...updates,
      email: updates.email?.trim().toLowerCase(),
    });
    await syncEmployee(updated.id);
    await logAudit('UPDATE', 'Employee', req.params.id, `Employee updated`);
    res.json(sanitizeEmployee(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!canDeleteEmployees(req.auth.systemRole)) {
      return res.status(403).json({ error: 'Only Admin or HR Manager can remove employees' });
    }
    if (req.auth.sub === req.params.id) {
      return res.status(400).json({ error: 'You cannot remove your own account' });
    }
    const existing = await repos.employees.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const tasks = await repos.tasks.getAll();
    for (const task of tasks.filter((t) => t.assigneeId === existing.id)) {
      await repos.tasks.update(task.id, { assigneeId: null });
    }

    const assignments = await repos.workAssignments.getAll();
    for (const a of assignments.filter((x) => x.employeeId === existing.id)) {
      await repos.workAssignments.delete(a.id);
    }

    const reviews = await repos.performanceReviews.getAll();
    for (const r of reviews.filter((x) => x.employeeId === existing.id)) {
      await repos.performanceReviews.delete(r.id);
    }

    await deleteDocumentsForEntity('employee', existing.id);
    await repos.employees.delete(existing.id);
    await logAudit('DELETE', 'Employee', existing.id, `Employee removed: ${existing.fullName}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// —— Performance reviews ——

router.get('/:id/performance', async (req, res) => {
  try {
    const employee = await repos.employees.getById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Not found' });
    if (!canViewEmployee(req.auth, employee)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const reviews = (await repos.performanceReviews.getAll())
      .filter((r) => r.employeeId === req.params.id)
      .sort((a, b) => (b.reviewDate || '').localeCompare(a.reviewDate || ''));
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/performance', async (req, res) => {
  try {
    if (!canManagePerformance(req.auth.systemRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const employee = await repos.employees.getById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Not found' });
    if (!canViewEmployee(req.auth, employee)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { period, rating, goals, notes, reviewDate } = req.body;
    if (!period?.trim()) return res.status(400).json({ error: 'Review period is required' });
    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const actor = await getActorEmployee(req.auth);
    const review = {
      id: uuidv4(),
      employeeId: req.params.id,
      period: period.trim(),
      rating: numRating,
      goals: goals?.trim() || '',
      notes: notes?.trim() || '',
      reviewDate: reviewDate || new Date().toISOString().slice(0, 10),
      reviewerId: req.auth.sub,
      reviewerName: actor?.fullName || 'Reviewer',
      createdAt: new Date().toISOString(),
    };
    await repos.performanceReviews.create(review);
    await logAudit('CREATE', 'PerformanceReview', review.id, `Performance review for ${employee.fullName}`);
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// —— Work assignments ——

router.get('/:id/assignments', async (req, res) => {
  try {
    const employee = await repos.employees.getById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Not found' });
    if (!canViewEmployee(req.auth, employee)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const assignments = (await repos.workAssignments.getAll())
      .filter((a) => a.employeeId === req.params.id)
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/assignments', async (req, res) => {
  try {
    if (!canManageAssignments(req.auth.systemRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const employee = await repos.employees.getById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Not found' });
    if (!canViewEmployee(req.auth, employee)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { title, description, projectId, startDate, endDate, status } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Assignment title is required' });
    if (!startDate) return res.status(400).json({ error: 'Start date is required' });

    const actor = await getActorEmployee(req.auth);
    const assignment = {
      id: uuidv4(),
      employeeId: req.params.id,
      title: title.trim(),
      description: description?.trim() || '',
      projectId: projectId || null,
      startDate,
      endDate: endDate || null,
      status: status || 'Active',
      assignedBy: req.auth.sub,
      assignedByName: actor?.fullName || 'Manager',
      createdAt: new Date().toISOString(),
    };
    await repos.workAssignments.create(assignment);
    await logAudit('CREATE', 'WorkAssignment', assignment.id, `Assignment for ${employee.fullName}`);
    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:employeeId/assignments/:assignmentId', async (req, res) => {
  try {
    if (!canManageAssignments(req.auth.systemRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const assignment = await repos.workAssignments.getById(req.params.assignmentId);
    if (!assignment || assignment.employeeId !== req.params.employeeId) {
      return res.status(404).json({ error: 'Not found' });
    }
    await repos.workAssignments.delete(assignment.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
