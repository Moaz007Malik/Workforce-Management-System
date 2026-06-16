import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { repos } from '../repositories/index.js';
import {
  pcpInsights,
  executiveDashboard,
} from '../utils/pcpSeedData.js';
import { getMasters, addMasterItem, removeMasterItem, updateMasterItem } from '../services/pcpMastersService.js';
import { hashPassword } from '../services/authService.js';

const router = Router();

function filterByRole(requests, role, businessUnit, userId) {
  if (role === 'Admin' || role === 'Executive') return requests;
  if (role === 'Approver') {
    return requests.filter(
      (r) => r.status === 'In Approval' || r.businessUnit === businessUnit || (userId && r.requestedById === userId)
    );
  }
  return requests.filter((r) => r.businessUnit === businessUnit || (userId && r.requestedById === userId));
}

function employeeToPcpUser(emp) {
  return {
    id: emp.id,
    name: emp.fullName,
    email: emp.email,
    role: emp.pcpRole,
    businessUnit: emp.businessUnit || emp.department,
    designation: emp.designation,
    active: emp.active !== false,
    onLeave: Boolean(emp.onLeave),
    approvalDelegateId: emp.approvalDelegateId || null,
  };
}

function nextPcpNo(requests) {
  const year = new Date().getFullYear();
  const nums = requests
    .map((r) => r.pcpNo)
    .filter((n) => n?.startsWith(`PCP-${year}-`))
    .map((n) => parseInt(n.split('-')[2], 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `PCP-${year}-${String(next).padStart(5, '0')}`;
}

function calcPositionMonthly(pos) {
  const benefits = (pos.benefits || []).reduce((s, b) => s + (b.amount || 0), 0);
  return (pos.proposedSalary || 0) + benefits;
}

function enrichRequest(req) {
  const positions = (req.positions || []).map((p) => {
    const monthly = p.monthlyBudget ?? calcPositionMonthly(p);
    const months = p.contractDuration === 'Open-ended' ? 12 : parseInt(p.contractDuration || '12', 10);
    return {
      ...p,
      monthlyBudget: monthly,
      totalBudget: p.totalBudget ?? monthly * months * (p.count || 1),
    };
  });
  const monthlyTotal = positions.reduce((s, p) => s + (p.monthlyBudget || 0) * (p.count || 1), 0);
  const filled = positions.reduce((s, p) => s + (p.filled || 0), 0);
  const vacant = positions.reduce((s, p) => s + (p.vacant ?? Math.max(0, (p.count || 1) - (p.filled || 0))), 0);
  return {
    ...req,
    positions,
    monthlyTotal: req.monthlyTotal ?? monthlyTotal,
    annualTotal: req.annualTotal ?? monthlyTotal * 12,
    positionSummary: `${positions.reduce((s, p) => s + (p.count || 1), 0)} (${filled} filled / ${vacant} vacant)`,
    sapSync: req.sapSync || 'Not Connected',
  };
}

router.get('/masters', async (_req, res) => {
  try {
    res.json(await getMasters());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/masters/items', async (req, res) => {
  try {
    const { category, value } = req.body;
    if (!category || value === undefined) {
      return res.status(400).json({ error: 'category and value are required' });
    }
    res.json(await addMasterItem(category, value));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/masters/items/:category/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    res.json(await updateMasterItem(req.params.category, index, req.body.value));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/masters/items/:category/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    res.json(await removeMasterItem(req.params.category, index));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/users', async (_req, res) => {
  try {
    const employees = await repos.employees.getAll();
    res.json(employees.filter((e) => e.pcpRole).map(employeeToPcpUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      role,
      businessUnit,
      designation,
      active = true,
    } = req.body;

    if (!fullName?.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!role) {
      return res.status(400).json({ error: 'PCP role is required' });
    }
    if (!businessUnit?.trim()) {
      return res.status(400).json({ error: 'Business unit is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const employees = await repos.employees.getAll();
    if (employees.some((e) => e.email?.toLowerCase() === normalizedEmail)) {
      return res.status(400).json({ error: 'Email is already in use' });
    }

    const nextNum = employees.length + 1;
    const systemRole = role === 'Admin' ? 'Admin' : 'Manager';
    const employee = {
      id: uuidv4(),
      employeeId: `DSC${String(nextNum).padStart(3, '0')}`,
      fullName: fullName.trim(),
      email: normalizedEmail,
      department: businessUnit.trim(),
      businessUnit: businessUnit.trim(),
      designation: designation?.trim() || role,
      systemRole,
      pcpRole: role,
      active: active !== false,
      onLeave: false,
      approvalDelegateId: null,
      skills: ['Project Management'],
      hourlyRate: 60,
      monthlySalary: 9600,
      capacityHours: 40,
      availability: 20,
      status: 'Available',
      passwordHash: await hashPassword(String(password)),
    };

    await repos.employees.create(employee);
    res.status(201).json(employeeToPcpUser(employee));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/approval-chains', async (_req, res) => {
  try {
    const chains = await repos.pcpApprovalChains.getAll();
    res.json(chains);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/approval-chains', async (req, res) => {
  try {
    const chain = {
      id: uuidv4(),
      businessUnit: req.body.businessUnit,
      gradeMin: req.body.gradeMin || 'B1',
      gradeMax: req.body.gradeMax || 'B3',
      budgetThreshold: Number(req.body.budgetThreshold) || 0,
      steps: req.body.steps || [],
    };
    if (!chain.businessUnit || !chain.steps.length) {
      return res.status(400).json({ error: 'businessUnit and steps are required' });
    }
    await repos.pcpApprovalChains.create(chain);
    res.status(201).json(chain);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/approval-chains/:id', async (req, res) => {
  try {
    const existing = await repos.pcpApprovalChains.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Chain not found' });
    const updated = { ...existing, ...req.body, id: existing.id };
    await repos.pcpApprovalChains.update(existing.id, updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/approval-chains/:id', async (req, res) => {
  try {
    await repos.pcpApprovalChains.delete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const emp = await repos.employees.getById(req.params.id);
    if (!emp) return res.status(404).json({ error: 'User not found' });

    if (req.body.password !== undefined && req.body.password !== '') {
      if (String(req.body.password).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
    }

    const updates = {
      pcpRole: req.body.role ?? emp.pcpRole,
      businessUnit: req.body.businessUnit ?? emp.businessUnit,
      department: req.body.businessUnit ?? emp.businessUnit ?? emp.department,
      active: req.body.active !== undefined ? Boolean(req.body.active) : emp.active !== false,
      onLeave: req.body.onLeave !== undefined ? Boolean(req.body.onLeave) : Boolean(emp.onLeave),
      approvalDelegateId: req.body.approvalDelegateId || null,
    };

    if (req.body.fullName?.trim()) {
      updates.fullName = req.body.fullName.trim();
    }
    if (req.body.email?.trim()) {
      const normalizedEmail = req.body.email.trim().toLowerCase();
      const employees = await repos.employees.getAll();
      const duplicate = employees.find(
        (e) => e.id !== emp.id && e.email?.toLowerCase() === normalizedEmail,
      );
      if (duplicate) {
        return res.status(400).json({ error: 'Email is already in use' });
      }
      updates.email = normalizedEmail;
    }
    if (req.body.password) {
      updates.passwordHash = await hashPassword(String(req.body.password));
    }
    if (updates.pcpRole === 'Admin') {
      updates.systemRole = 'Admin';
    } else if (emp.systemRole === 'Admin' && updates.pcpRole !== 'Admin') {
      updates.systemRole = 'Manager';
    }

    const merged = { ...emp, ...updates };
    await repos.employees.update(emp.id, merged);
    res.json(employeeToPcpUser(merged));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/requests', async (req, res) => {
  try {
    const { role = 'Requester', businessUnit, userId, status, client, search } = req.query;
    let list = (await repos.pcpRequests.getAll()).map(enrichRequest);
    list = filterByRole(list, role, businessUnit, userId);
    if (status && status !== 'All') list = list.filter((r) => r.status === status);
    if (client && client !== 'All') list = list.filter((r) => r.client === client);
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(
        (r) =>
          r.pcpNo.toLowerCase().includes(q) ||
          r.positions?.some((p) => p.title.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/requests/:id', async (req, res) => {
  try {
    const item = await repos.pcpRequests.getById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const revisions = (await repos.pcpRevisions.getAll()).filter((r) => r.pcpId === item.id);
    res.json({ ...enrichRequest(item), revisions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/requests', async (req, res) => {
  try {
    const all = await repos.pcpRequests.getAll();
    const now = new Date().toISOString();
    const body = {
      ...req.body,
      id: req.body.id || `pcp-${uuidv4().slice(0, 8)}`,
      pcpNo: req.body.pcpNo || nextPcpNo(all),
      status: req.body.status || 'Draft',
      currentStage: 'Draft',
      revision: 0,
      approvalTrail: [],
      sapSync: 'Not Connected',
      createdAt: now,
      updatedAt: now,
    };
    const created = await repos.pcpRequests.create(body);
    res.status(201).json(enrichRequest(created));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/requests/:id', async (req, res) => {
  try {
    const updated = await repos.pcpRequests.update(req.params.id, {
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(enrichRequest(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/requests/:id/submit', async (req, res) => {
  try {
    const item = await repos.pcpRequests.getById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const chains = await repos.pcpApprovalChains.getAll();
    const chain = chains.find((c) => c.businessUnit === item.businessUnit) || chains[0];
    const updated = await repos.pcpRequests.update(req.params.id, {
      status: 'In Approval',
      currentStage: chain?.steps?.[0] || 'BU Head',
      slaHoursRemaining: 48,
      approvalTrail: [
        ...(item.approvalTrail || []),
        { step: 'Submitted', by: item.requestedBy, at: new Date().toISOString() },
        { step: 'Pending', by: chain?.steps?.[0] || 'BU Head', at: null, slaDue: new Date(Date.now() + 48 * 3600000).toISOString() },
      ],
      updatedAt: new Date().toISOString(),
    });
    res.json({ ...enrichRequest(updated), approvalChain: chain?.steps || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/requests/:id/action', async (req, res) => {
  try {
    const { action, comment } = req.body;
    const item = await repos.pcpRequests.getById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });

    let patch = { updatedAt: new Date().toISOString() };
    const trail = [...(item.approvalTrail || [])];

    if (action === 'approve') {
      const chains = await repos.pcpApprovalChains.getAll();
      const chain = chains.find((c) => c.businessUnit === item.businessUnit);
      const steps = chain?.steps || ['BU Head', 'Finance Manager'];
      const pendingIdx = trail.findIndex((t) => t.step === 'Pending');
      if (pendingIdx >= 0) {
        trail[pendingIdx] = {
          ...trail[pendingIdx],
          step: 'Approved',
          at: new Date().toISOString(),
          tatHours: item.slaHoursRemaining ? 48 - item.slaHoursRemaining : 12,
        };
      }
      const nextStep = steps.find((s) => !trail.some((t) => t.by?.includes(s) && t.step === 'Approved'));
      if (nextStep && steps.indexOf(nextStep) < steps.length - 1) {
        const next = steps[steps.indexOf(nextStep) + 1] || steps[steps.length - 1];
        trail.push({ step: 'Pending', by: next, at: null, slaDue: new Date(Date.now() + 48 * 3600000).toISOString() });
        patch = { ...patch, status: 'In Approval', currentStage: next, slaHoursRemaining: 48 };
      } else {
        patch = { ...patch, status: 'Approved', currentStage: 'Closed', slaHoursRemaining: 0 };
      }
    } else if (action === 'return') {
      patch = { ...patch, status: 'Returned', currentStage: 'Returned', returnComment: comment };
    } else if (action === 'reject') {
      patch = { ...patch, status: 'Rejected', currentStage: 'Rejected', rejectComment: comment };
    }

    patch.approvalTrail = trail;
    const updated = await repos.pcpRequests.update(req.params.id, patch);
    res.json(enrichRequest(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/approval-queue', async (req, res) => {
  try {
    const { role = 'Approver', businessUnit } = req.query;
    let list = (await repos.pcpRequests.getAll())
      .filter((r) => r.status === 'In Approval')
      .map(enrichRequest);
    if (role !== 'Admin') {
      list = list.filter((r) => !businessUnit || r.businessUnit === businessUnit);
    }
    list.sort((a, b) => (a.slaHoursRemaining || 999) - (b.slaHoursRemaining || 999));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/revisions', async (req, res) => {
  try {
    const { pcpId } = req.query;
    let list = await repos.pcpRevisions.getAll();
    if (pcpId) list = list.filter((r) => r.pcpId === pcpId);
    list.sort((a, b) => a.revision - b.revision);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function accumulateChangesBetween(revisions, fromRev, toRev) {
  const lo = Math.min(fromRev, toRev);
  const hi = Math.max(fromRev, toRev);
  if (lo === hi) return [];
  const changes = [];
  for (let n = lo + 1; n <= hi; n += 1) {
    const rev = revisions.find((r) => r.revision === n);
    if (rev?.changes?.length) changes.push(...rev.changes);
  }
  return changes;
}

function snapshotTotals(snapshot) {
  if (!snapshot) return { monthlyTotal: null, headcount: null };
  return {
    monthlyTotal: snapshot.monthlyTotal ?? null,
    headcount: snapshot.headcount ?? snapshot.positions?.reduce((s, p) => s + (p.count || 1), 0) ?? null,
  };
}

router.get('/revisions/compare', async (req, res) => {
  try {
    const { pcpId, revA, revB } = req.query;
    const revANum = parseInt(revA, 10);
    const revBNum = parseInt(revB, 10);
    const revisions = (await repos.pcpRevisions.getAll())
      .filter((r) => r.pcpId === pcpId)
      .sort((a, b) => a.revision - b.revision);
    const a = revisions.find((r) => r.revision === revANum);
    const b = revisions.find((r) => r.revision === revBNum);
    const request = await repos.pcpRequests.getById(pcpId);

    if (!a || !b) {
      return res.status(404).json({ error: 'One or both revisions not found' });
    }

    const changes = accumulateChangesBetween(revisions, revANum, revBNum);
    const totalsA = snapshotTotals(a.snapshot);
    const totalsB = snapshotTotals(b.snapshot);
    const monthlyDelta =
      totalsA.monthlyTotal != null && totalsB.monthlyTotal != null
        ? totalsB.monthlyTotal - totalsA.monthlyTotal
        : null;
    const headcountDelta =
      totalsA.headcount != null && totalsB.headcount != null
        ? totalsB.headcount - totalsA.headcount
        : null;

    let deltaSummary = 'No changes between selected revisions';
    if (revANum === revBNum) {
      deltaSummary = 'Same revision selected — no differences';
    } else if (changes.length) {
      const parts = [];
      if (monthlyDelta != null && monthlyDelta !== 0) {
        parts.push(`${monthlyDelta > 0 ? '+' : ''}AED ${monthlyDelta.toLocaleString()}/month`);
      }
      if (headcountDelta != null && headcountDelta !== 0) {
        parts.push(`${headcountDelta > 0 ? '+' : ''}${headcountDelta} headcount`);
      }
      parts.push(`${changes.length} field change(s)`);
      deltaSummary = parts.join(' · ');
    } else if (monthlyDelta != null && monthlyDelta !== 0) {
      deltaSummary = `${monthlyDelta > 0 ? '+' : ''}AED ${monthlyDelta.toLocaleString()}/month personnel cost`;
    }

    res.json({
      pcpNo: request?.pcpNo,
      revA: a,
      revB: b,
      deltaSummary,
      changes,
      monthlyTotalA: totalsA.monthlyTotal,
      monthlyTotalB: totalsB.monthlyTotal,
      headcountA: totalsA.headcount,
      headcountB: totalsB.headcount,
      monthlyDelta,
      headcountDelta,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/revisions', async (req, res) => {
  try {
    const { pcpId, summary, justification, changes } = req.body;
    const request = await repos.pcpRequests.getById(pcpId);
    if (!request) return res.status(404).json({ error: 'PCP not found' });
    const newRev = (request.revision || 0) + 1;
    const rev = await repos.pcpRevisions.create({
      id: `rev-${pcpId}-${newRev}`,
      pcpId,
      revision: newRev,
      author: request.requestedBy,
      date: new Date().toISOString().slice(0, 10),
      status: 'In Approval',
      summary,
      justification,
      changes: changes || [],
    });
    await repos.pcpRequests.update(pcpId, {
      revision: newRev,
      status: 'In Approval',
      currentStage: 'BU Head',
      updatedAt: new Date().toISOString(),
    });
    res.status(201).json(rev);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/executive/dashboard', async (_req, res) => {
  try {
    res.json(executiveDashboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/insights', async (_req, res) => {
  try {
    res.json(pcpInsights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function mdTable(rows) {
  if (!rows?.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((h) => String(row[h] ?? '')).join(' | ')} |`),
  ];
  return `\n\n${lines.join('\n')}`;
}

router.post('/assistant', async (req, res) => {
  try {
    const { message, role = 'Requester', businessUnit, userId } = req.body;
    const lower = (message || '').toLowerCase();
    const requests = filterByRole(
      (await repos.pcpRequests.getAll()).map(enrichRequest),
      role,
      businessUnit,
      userId
    );

    if (lower.includes('another business unit') || (lower.includes('project c') && role === 'Requester')) {
      return res.json({
        text: "You don't have access to that data.",
        source: 'Role-scoped access policy',
      });
    }

    if (lower.includes('vacant') && lower.includes('electrician')) {
      const rows = [];
      requests.forEach((r) => {
        r.positions?.forEach((p) => {
          if (p.title === 'Electrician' && (p.vacant || 0) > 0) {
            rows.push({
              pcpNo: r.pcpNo,
              position: p.title,
              shift: p.shift,
              daysVacant: p.daysVacant || 0,
              plannedStart: p.plannedStart,
              client: r.client,
            });
          }
        });
      });
      return res.json({
        text: `## Vacant Electrician Positions\n\nFound **${rows.length}** vacant electrician position(s).${mdTable(rows)}`,
        source: `Based on ${requests.length} PCP records, ${businessUnit || 'your BU'}, Jan–Jun 2026`,
        actions: ['View in Dashboard'],
      });
    }

    if (lower.includes('over budget') || lower.includes('cost center')) {
      return res.json({
        text: '## Budget Variance\n\n**CC104** and **CC103** are over budget this quarter. CC104 leads at **+9%** projected variance.',
        source: 'Based on approved PCP costing, Q2 2026',
        actions: ['View Full Report', 'Export Excel'],
      });
    }

    if (lower.includes('compare') && lower.includes('rev')) {
      const pcp = requests.find((r) => lower.includes(r.pcpNo.toLowerCase())) || requests[0];
      const revisions = (await repos.pcpRevisions.getAll()).filter((r) => r.pcpId === pcp?.id);
      const revB = revisions[revisions.length - 1];
      return res.json({
        text: revB?.summary || 'Shift changed Day → Night; +AED 800/month night allowance.',
        changes: revB?.changes || [],
        source: `${pcp?.pcpNo} revision history`,
        actions: ['Open Compare View'],
        link: `/pcp/revisions?pcpId=${pcp?.id}`,
      });
    }

    if (lower.includes('welder') && lower.includes('ruwais')) {
      return res.json({
        text: 'Forecast: 6 welders in Ruwais — estimated 28–35 days to fill (confidence 75%). External staffing agency recommended (17 days faster vs in-house).',
        source: 'AI forecast model · Ruwais trade availability',
        actions: ['Create PCP from this need'],
      });
    }

    if (lower.includes('active project') || lower.includes('summarize all active')) {
      const projects = await repos.projects.getAll();
      const active = projects.filter((p) => p.status === 'Active' || p.status === 'In Progress');
      const rows = active.map((p) => ({
        project: p.name,
        client: p.client,
        budget: p.budget,
        status: p.status,
      }));
      return res.json({
        text: `## Active Projects\n\n**${active.length}** active project(s) in portfolio.${mdTable(rows)}`,
        source: 'Descon project database',
      });
    }

    if (lower.includes('react') && lower.includes('skill')) {
      const employees = await repos.employees.getAll();
      const matches = employees.filter((e) => e.skills?.some((s) => /react/i.test(s)));
      const rows = matches.map((e) => ({
        name: e.fullName,
        designation: e.designation,
        skills: (e.skills || []).join(', '),
        status: e.status,
      }));
      return res.json({
        text: `## Internal React Skills\n\n**${matches.length}** employee(s) with React skills.${mdTable(rows)}`,
        source: 'HR employee database',
      });
    }

    if (lower.includes('summarize') || lower.includes('activity this month')) {
      return res.json({
        text: `## PCP Summary\n\nThis month: **${requests.filter((r) => r.status === 'In Approval').length}** PCPs in approval, **${requests.filter((r) => r.status === 'Approved').length}** approved. Avg approval TAT **2.1 days**. Notable: night-shift revisions on ADNOC Refinery Electrical Turnaround.`,
        source: `Based on ${requests.length} PCP records, Jun 2026`,
        actions: ['Export PDF'],
      });
    }

    if (lower.includes('pending') && lower.includes('approval')) {
      const pending = requests.filter((r) => r.status === 'In Approval');
      const rows = pending.map((r) => ({ pcpNo: r.pcpNo, client: r.client, stage: r.currentStage, sla: `${r.slaHoursRemaining || 0}h` }));
      return res.json({
        text: `## Pending Approvals\n\n**${pending.length}** PCP(s) pending your approval.${mdTable(rows)}`,
        source: 'Approval queue',
      });
    }

    if (
      lower.includes('forecast') ||
      lower.includes('insight') ||
      lower.includes('weekly') ||
      lower.includes('sourcing') ||
      lower.includes('at risk') ||
      lower.includes('headcount projection') ||
      lower.includes('cost forecast') ||
      lower.includes('time to fill') ||
      lower.includes('time-to-fill') ||
      (lower.includes('need') && lower.includes('identif'))
    ) {
      const needs = pcpInsights.needs || [];
      if (lower.includes('weekly') || lower.includes('summarize this week')) {
        return res.json({
          text: `## Weekly Summary\n\n${pcpInsights.weeklySummary}`,
          source: 'AI Insights · Jun 2026',
        });
      }
      if (lower.includes('headcount') && lower.includes('forecast')) {
        const hf = pcpInsights.headcountForecast;
        const rows = hf.labels.map((label, i) => ({
          Month: label,
          Actual: hf.actual[i] ?? '—',
          Projected: hf.projected[i] ?? '—',
        }));
        return res.json({
          text: `## Headcount Forecast\n\nPeak projected **1,310** by Aug 2026.${mdTable(rows)}`,
          source: 'Rolling workforce model',
        });
      }
      if (lower.includes('cost') || lower.includes('at risk') || lower.includes('variance')) {
        const cf = pcpInsights.costForecast;
        const atRisk = cf.atRisk.map((r) => `- **${r.costCenter}** (+${r.variance}%) — ${r.note}`).join('\n');
        return res.json({
          text: `## Cost Forecast & Variance\n\n${atRisk}\n\nOpen **AI Insights** for full charts.`,
          source: 'Approved PCP costing · H2 2026',
          actions: ['View AI Insights'],
        });
      }
      if (lower.includes('need') || lower.includes('sourcing') || lower.includes('agency') || lower.includes('welder')) {
        const lines = needs.map(
          (n) => `**${n.title}** — ${n.recommendation}\n${n.reasoning}`,
        );
        return res.json({
          text: `## Identified Needs\n\n${lines.join('\n\n')}`,
          source: 'Need identification engine',
          actions: ['View AI Insights'],
        });
      }
      return res.json({
        text: `## AI Insights\n\n${pcpInsights.weeklySummary}\n\nOpen **AI Insights** for forecasts and sourcing cards.`,
        source: 'CORVI — rule-based insights',
        actions: ['View AI Insights'],
      });
    }

    res.json({
      text: '## How I can help\n\n- Vacant positions & electrician roles\n- Budget variance by cost center\n- Revision comparisons\n- PCP summaries & pending approvals\n- Active projects & React skills\n\nTry one of the suggested questions below.',
      source: 'CORVI — rule-based assistant',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
