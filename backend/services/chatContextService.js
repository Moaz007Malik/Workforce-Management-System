import { repos } from '../repositories/index.js';
import { getDashboardMetrics } from './dashboardService.js';
import { sanitizeEmployee } from './authService.js';

function filterPcpsByRole(requests, role, businessUnit, userId) {
  if (role === 'Admin' || role === 'Executive') return requests;
  if (role === 'Approver') {
    return requests.filter(
      (r) =>
        r.status === 'In Approval'
        || r.businessUnit === businessUnit
        || (userId && r.requestedById === userId),
    );
  }
  if (role === 'HR') return requests;
  return requests.filter(
    (r) => r.businessUnit === businessUnit || (userId && r.requestedById === userId),
  );
}

function slimProject(p) {
  return {
    id: p.id,
    projectId: p.projectId,
    name: p.name,
    client: p.client,
    status: p.status,
    priority: p.priority,
    projectManager: p.projectManager,
    budget: p.budget,
    revenue: p.revenue,
    startDate: p.startDate,
    endDate: p.endDate,
    description: p.description?.slice(0, 300),
  };
}

function slimEmployee(e) {
  const safe = sanitizeEmployee(e);
  return {
    id: safe.id,
    fullName: safe.fullName,
    email: safe.email,
    department: safe.department,
    businessUnit: safe.businessUnit,
    designation: safe.designation,
    skills: safe.skills,
    status: safe.status,
    availability: safe.availability,
    capacityHours: safe.capacityHours,
    systemRole: safe.systemRole,
    pcpRole: safe.pcpRole,
  };
}

function slimPcp(r) {
  return {
    id: r.id,
    pcpNo: r.pcpNo,
    client: r.client,
    businessUnit: r.businessUnit,
    status: r.status,
    currentStage: r.currentStage,
    priority: r.priority,
    monthlyTotal: r.monthlyTotal,
    positions: (r.positions || []).map((p) => ({
      title: p.title,
      count: p.count,
      filled: p.filled,
      vacant: p.vacant,
      shift: p.shift,
      grade: p.grade,
    })),
  };
}

export async function buildChatContext({ pcpRole, businessUnit, userId, systemRole, pathname }) {
  const [
    projects,
    employees,
    tasks,
    pcpRequests,
    risks,
    issues,
    dashboard,
  ] = await Promise.all([
    repos.projects.getAll(),
    repos.employees.getAll(),
    repos.tasks.getAll(),
    repos.pcpRequests.getAll(),
    repos.risks.getAll(),
    repos.issues.getAll(),
    getDashboardMetrics(),
  ]);

  const scopedPcps = filterPcpsByRole(
    pcpRequests,
    pcpRole || 'Requester',
    businessUnit,
    userId,
  );

  const skillIndex = {};
  employees.forEach((e) => {
    (e.skills || []).forEach((skill) => {
      if (!skillIndex[skill]) skillIndex[skill] = [];
      skillIndex[skill].push(e.fullName);
    });
  });

  const openTasks = tasks
    .filter((t) => !['Completed', 'Cancelled'].includes(t.status))
    .slice(0, 40)
    .map((t) => ({
      title: t.title,
      projectId: t.projectId,
      status: t.status,
      assigneeId: t.assigneeId,
      requiredSkills: t.requiredSkills,
    }));

  return {
    page: pathname || '/',
    user: { systemRole, pcpRole, businessUnit, userId },
    summary: {
      projects: projects.length,
      activeProjects: projects.filter((p) => p.status === 'Active').length,
      employees: employees.length,
      openTasks: tasks.filter((t) => !['Completed', 'Cancelled'].includes(t.status)).length,
      pcpInScope: scopedPcps.length,
      pcpInApproval: scopedPcps.filter((r) => r.status === 'In Approval').length,
    },
    kpis: dashboard.kpis,
    projectProfitability: dashboard.projectProfitability?.slice(0, 12),
    resourceUtilization: dashboard.resourceUtilization?.slice(0, 15),
    projects: projects.map(slimProject),
    employees: employees.map(slimEmployee),
    skillIndex,
    pcpRequests: scopedPcps.slice(0, 25).map(slimPcp),
    openTasks,
    risks: risks.slice(0, 12).map((r) => ({
      projectId: r.projectId,
      risk: r.risk,
      owner: r.owner,
      status: r.status,
      impact: r.impact,
    })),
    issues: issues.slice(0, 12).map((i) => ({
      projectId: i.projectId,
      issue: i.issue,
      owner: i.owner,
      status: i.status,
      priority: i.priority,
    })),
  };
}

export function buildSystemPrompt(context) {
  return `You are CORVI, the AI assistant for Descon Personnel Cost Planning (ProMgmt).

RULES:
1. Answer using the DATABASE CONTEXT JSON below for projects, employees, PCPs, tasks, risks, issues, and KPIs.
2. If the user asks for data not in context, say you don't have it — do not invent project names, budgets, or employees.
3. Use markdown: **bold** for emphasis, bullet lists for clarity, tables when comparing multiple rows.
4. For external hiring (Rozee, LinkedIn, Indeed, outside company): always show internal employees first if any match, then external search guidance.
5. Never fabricate real external candidate names, emails, or phone numbers. Use search links or web citations only.
6. Keep answers focused and actionable for construction / engineering workforce planning.
7. Currency is AED unless stated otherwise.

DATABASE CONTEXT:
${JSON.stringify(context)}`;
}
