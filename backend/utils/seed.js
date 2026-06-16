import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { repos } from '../repositories/index.js';
import {
  pcpRequests,
  pcpRevisions,
  pcpApprovalChains,
  pcpMasters,
} from './pcpSeedData.js';
import { hashPassword, defaultPasswordForEmployee } from '../services/authService.js';


import dns from "dns";
if (process.env.FORCE_PUBLIC_DNS === "true") {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
  console.log("Using public DNS servers (1.1.1.1, 8.8.8.8)");
}


const departments = [
  { id: 'dept-1', name: 'Construction – North', head: 'Fatima Bukhari', employeeCount: 3 },
  { id: 'dept-2', name: 'MEP – East', head: 'Hamza Sheikh', employeeCount: 2 },
  { id: 'dept-3', name: 'Corporate HR', head: 'Usman Malik', employeeCount: 3 },
  { id: 'dept-4', name: 'Logistics – South', head: 'Saira Malik', employeeCount: 2 },
];

const skillsList = [
  { id: 'sk-1', name: 'Welding', category: 'Trades' },
  { id: 'sk-2', name: 'Electrical', category: 'Trades' },
  { id: 'sk-3', name: 'Rigging', category: 'Trades' },
  { id: 'sk-4', name: 'HSE', category: 'Safety' },
  { id: 'sk-5', name: 'Piping', category: 'Trades' },
  { id: 'sk-6', name: 'Mechanical', category: 'Trades' },
  { id: 'sk-7', name: 'Project Management', category: 'Management' },
  { id: 'sk-8', name: 'Logistics', category: 'Operations' },
  { id: 'sk-9', name: 'Scaffolding', category: 'Trades' },
  { id: 'sk-10', name: 'Agile/Scrum', category: 'Methodology' },
];

const employees = [
  { id: 'emp-1', employeeId: 'DSC001', fullName: 'Muhammad Imran', email: 'requester@wms.demo', department: 'Construction – North', businessUnit: 'Construction – North', designation: 'Project Coordinator', systemRole: 'Manager', pcpRole: 'Requester', active: true, skills: ['Project Management', 'HSE'], hourlyRate: 65, monthlySalary: 10400, capacityHours: 40, availability: 16, status: 'Allocated' },
  { id: 'emp-2', employeeId: 'DSC002', fullName: 'Fatima Bukhari', email: 'approver@wms.demo', department: 'Construction – North', businessUnit: 'Construction – North', designation: 'BU Head', systemRole: 'Manager', pcpRole: 'Approver', active: true, skills: ['Project Management', 'HSE'], hourlyRate: 110, monthlySalary: 17600, capacityHours: 40, availability: 8, status: 'Fully Allocated' },
  { id: 'emp-3', employeeId: 'DSC003', fullName: 'Hassan Raza', email: 'hr@wms.demo', department: 'Corporate HR', businessUnit: 'Corporate HR', designation: 'HR Manager', systemRole: 'HR', active: true, skills: ['Project Management', 'Human Resources'], hourlyRate: 95, monthlySalary: 15200, capacityHours: 40, availability: 12, status: 'Allocated' },
  { id: 'emp-4', employeeId: 'DSC004', fullName: 'Usman Malik', email: 'admin@wms.demo', department: 'Corporate HR', businessUnit: 'Corporate HR', designation: 'HR Systems Admin', systemRole: 'Admin', pcpRole: 'Admin', active: true, skills: ['Project Management', 'Logistics', 'React', 'TypeScript'], hourlyRate: 90, monthlySalary: 14400, capacityHours: 40, availability: 10, status: 'Allocated' },
  { id: 'emp-5', employeeId: 'DSC005', fullName: 'Ayesha Siddiqui', email: 'executive@wms.demo', department: 'Corporate HR', businessUnit: 'Corporate HR', designation: 'VP Operations', systemRole: 'Manager', pcpRole: 'Executive', active: true, skills: ['Project Management', 'Strategic Planning'], hourlyRate: 120, monthlySalary: 19200, capacityHours: 40, availability: 20, status: 'Allocated' },
  { id: 'emp-6', employeeId: 'DSC006', fullName: 'Bilal Ahmed', email: 'bilal.ahmed@wms.demo', department: 'Construction – North', businessUnit: 'Construction – North', designation: 'Site Engineer', systemRole: 'Manager', skills: ['Mechanical', 'HSE', 'Project Management'], hourlyRate: 85, monthlySalary: 13600, capacityHours: 40, availability: 18, status: 'Allocated' },
  { id: 'emp-7', employeeId: 'DSC007', fullName: 'Hamza Sheikh', email: 'hamza.sheikh@wms.demo', department: 'MEP – East', businessUnit: 'MEP – East', designation: 'MEP Manager', systemRole: 'Manager', pcpRole: 'Approver', active: true, skills: ['Electrical', 'Piping', 'Project Management'], hourlyRate: 100, monthlySalary: 16000, capacityHours: 40, availability: 14, status: 'Allocated' },
  { id: 'emp-8', employeeId: 'DSC008', fullName: 'Zainab Khattak', email: 'zainab.khattak@wms.demo', department: 'MEP – East', businessUnit: 'MEP – East', designation: 'Electrician', systemRole: 'Manager', skills: ['Electrical'], hourlyRate: 55, monthlySalary: 8800, capacityHours: 40, availability: 24, status: 'Available' },
  { id: 'emp-9', employeeId: 'DSC009', fullName: 'Tariq Mehmood', email: 'tariq.mehmood@wms.demo', department: 'Construction – North', businessUnit: 'Construction – North', designation: 'Welder', systemRole: 'Manager', skills: ['Welding', 'Rigging'], hourlyRate: 50, monthlySalary: 8000, capacityHours: 40, availability: 22, status: 'Available' },
  { id: 'emp-10', employeeId: 'DSC010', fullName: 'Farah Qureshi', email: 'farah.qureshi@wms.demo', department: 'Logistics – South', businessUnit: 'Logistics – South', designation: 'Rigger', systemRole: 'Manager', skills: ['Rigging', 'Scaffolding'], hourlyRate: 48, monthlySalary: 7680, capacityHours: 40, availability: 0, status: 'On Leave' },
];

const projects = [
  {
    id: 'proj-1', projectId: 'PRJ-A', name: 'ADNOC Refinery Electrical Turnaround', client: 'ADNOC Refinery', description: 'Refinery turnaround and electrical manpower deployment',
    projectManager: 'Muhammad Imran', projectManagerId: 'emp-1', startDate: '2025-01-15', endDate: '2026-12-31',
    status: 'Active', budget: 8200000, revenue: 9500000, priority: 'High',
    phases: [
      { id: 'phase-1-1', name: 'Mobilization', milestones: [{ id: 'ms-1-1', name: 'Site Mobilization Complete', dueDate: '2025-03-01' }] },
      { id: 'phase-1-2', name: 'Execution', milestones: [{ id: 'ms-1-2', name: 'Electrical Package Complete', dueDate: '2026-06-30' }] },
      { id: 'phase-1-3', name: 'Demobilization', milestones: [{ id: 'ms-1-3', name: 'Demob & Close-out', dueDate: '2026-12-31' }] },
    ],
  },
  {
    id: 'proj-2', projectId: 'PRJ-B', name: 'Ruwais Piping & Welding Package', client: 'ADNOC Piping', description: 'Piping phase manpower — welders, riggers, and HSE',
    projectManager: 'Fatima Bukhari', projectManagerId: 'emp-2', startDate: '2025-06-01', endDate: '2027-03-31',
    status: 'Active', budget: 5400000, revenue: 6200000, priority: 'High',
    phases: [
      { id: 'phase-2-1', name: 'Piping Prep', milestones: [{ id: 'ms-2-1', name: 'Piping Phase Start', dueDate: '2025-09-01' }] },
      { id: 'phase-2-2', name: 'Piping Execution', milestones: [{ id: 'ms-2-2', name: 'Welding Package Complete', dueDate: '2026-09-01' }] },
    ],
  },
  {
    id: 'proj-3', projectId: 'PRJ-C', name: 'Ruwais MEP Campus Build', client: 'Ruwais MEP Campus', description: 'MEP campus build — electrical and mechanical trades',
    projectManager: 'Hamza Sheikh', projectManagerId: 'emp-7', startDate: '2025-03-01', endDate: '2026-10-31',
    status: 'Active', budget: 3100000, revenue: 3800000, priority: 'Medium',
    phases: [
      { id: 'phase-3-1', name: 'MEP Install', milestones: [{ id: 'ms-3-1', name: 'MEP Rough-in', dueDate: '2025-10-01' }] },
      { id: 'phase-3-2', name: 'Commissioning', milestones: [{ id: 'ms-3-2', name: 'Handover', dueDate: '2026-10-31' }] },
    ],
  },
  {
    id: 'proj-4', projectId: 'PRJ-A2', name: 'ADNOC Refinery Night-Shift Expansion', client: 'ADNOC Refinery', description: 'Night-shift electrical expansion on ADNOC Refinery Electrical Turnaround',
    projectManager: 'Muhammad Imran', projectManagerId: 'emp-1', startDate: '2026-01-01', endDate: '2027-06-30',
    status: 'Planned', budget: 2800000, revenue: 3200000, priority: 'Medium',
    phases: [
      { id: 'phase-4-1', name: 'Planning', milestones: [{ id: 'ms-4-1', name: 'PCP Approved', dueDate: '2026-06-01' }] },
    ],
  },
  {
    id: 'proj-5', projectId: 'PRJ-HSE', name: 'HSE Compliance Program', client: 'WMS Corporate', description: 'Group-wide HSE audit and compliance remediation',
    projectManager: 'Usman Malik', projectManagerId: 'emp-4', startDate: '2024-10-01', endDate: '2025-05-31',
    status: 'Completed', budget: 450000, revenue: 520000, priority: 'High',
    phases: [
      { id: 'phase-5-1', name: 'Audit', milestones: [{ id: 'ms-5-1', name: 'Final Report', dueDate: '2025-05-31' }] },
    ],
  },
];

const taskTitles = [
  'Site safety inspection', 'Welding procedure qualification', 'Electrical cable routing',
  'Scaffold erection plan', 'HSE toolbox talk', 'Manpower mobilization checklist',
  'Cost center charging review', 'PCP position approval', 'Night shift roster update',
  'Rigging lift plan', 'Piping isometric review', 'Permit to work coordination',
  'Trade availability forecast', 'Agency sourcing evaluation', 'Demobilization schedule',
  'Timesheet reconciliation', 'Budget variance report', 'Vacancy ageing review',
  'Site access badge processing', 'Medical fitness verification', 'Equipment allocation',
  'Client progress meeting', 'WBS cost tracking', 'Subcontractor coordination',
  'Material delivery schedule', 'Quality inspection', 'Incident investigation',
  'Training compliance audit', 'Camp accommodation assignment', 'Transport roster',
  'Shift handover briefing', 'Payroll cost validation', 'SAP headcount sync',
  'Emergency drill coordination', 'Work permit renewal', 'Trade certification check',
  'Project milestone review', 'Resource leveling update', 'Overtime approval',
  'Leave coverage planning', 'Site logistics planning', 'Commissioning support',
  'Mechanical fit-up inspection', 'Electrical termination', 'Piping hydro test',
  'HSE audit close-out', 'Manpower forecast update', 'Client variation order',
  'Demob equipment return', 'Final timesheet sign-off', 'Project close-out report',
];

const statuses = ['Not Started', 'In Progress', 'Review', 'Blocked', 'Completed'];
const kanbanStatuses = ['Backlog', 'To Do', 'In Progress', 'Review', 'Completed'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

const tasks = [];
const projectIds = projects.map((p) => p.id);
const empIds = employees.filter((e) => e.status !== 'On Leave').map((e) => e.id);

for (let i = 0; i < 50; i++) {
  const project = projects[i % projects.length];
  const phase = project.phases[randomInt(0, project.phases.length - 1)];
  const milestone = phase.milestones?.[0];
  const status = i < 15 ? 'Completed' : randomItem(statuses);
  const kanbanMap = { 'Not Started': 'Backlog', 'In Progress': 'In Progress', Review: 'Review', Blocked: 'To Do', Completed: 'Completed' };
  const estHours = randomInt(4, 40);
  const actHours = status === 'Completed' ? estHours + randomInt(-4, 8) : status === 'Not Started' ? 0 : randomInt(0, estHours);

  tasks.push({
    id: `task-${i + 1}`,
    title: taskTitles[i % taskTitles.length],
    description: `Task description for ${taskTitles[i % taskTitles.length]}`,
    projectId: project.id,
    phaseId: phase.id,
    milestoneId: milestone?.id,
    assigneeId: randomItem(empIds),
    priority: randomItem(priorities),
    status,
    kanbanStatus: status === 'Not Started' ? randomItem(['Backlog', 'To Do']) : kanbanMap[status],
    estimatedHours: estHours,
    actualHours: Math.max(0, actHours),
    dueDate: randomDate(new Date('2025-01-01'), new Date('2026-06-30')),
    requiredSkills: [randomItem(['Welding', 'Electrical', 'Rigging', 'HSE', 'Piping', 'Mechanical', 'Project Management'])],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

const timesheets = [];
for (let i = 0; i < 100; i++) {
  const task = randomItem(tasks.filter((t) => t.assigneeId));
  const emp = employees.find((e) => e.id === task.assigneeId) || randomItem(employees);
  const date = randomDate(new Date('2025-01-01'), new Date());
  const statuses = i < 70 ? 'Approved' : i < 90 ? 'Pending' : 'Rejected';
  timesheets.push({
    id: `ts-${i + 1}`,
    employeeId: task.assigneeId || emp.id,
    projectId: task.projectId,
    taskId: task.id,
    date,
    hoursWorked: randomInt(2, 8),
    notes: `Work on ${task.title}`,
    status: statuses,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

const budgets = projects.map((p) => ({
  id: `budget-${p.id}`,
  projectId: p.id,
  amount: p.budget,
  plannedCost: Math.round(p.budget * 0.85),
  actualCost: Math.round(p.budget * (p.status === 'Completed' ? 0.92 : randomInt(40, 75) / 100)),
  currency: 'AED',
  fiscalYear: 2025,
  createdAt: new Date().toISOString(),
}));

const risks = [
  { id: 'risk-1', projectId: 'proj-1', risk: 'Electrician vacancies ageing 45+ days', probability: 'High', impact: 'High', mitigation: 'Agency sourcing for critical roles', owner: 'Muhammad Imran', status: 'Open' },
  { id: 'risk-2', projectId: 'proj-1', risk: 'Night-shift premium cost overrun', probability: 'Medium', impact: 'Medium', mitigation: 'PCP revision controls', owner: 'Fatima Bukhari', status: 'Monitoring' },
  { id: 'risk-3', projectId: 'proj-2', risk: 'Welder shortage at Ruwais', probability: 'High', impact: 'High', mitigation: 'External staffing agency', owner: 'Hamza Sheikh', status: 'Open' },
  { id: 'risk-4', projectId: 'proj-2', risk: 'Piping phase delayed mobilization', probability: 'Medium', impact: 'Critical', mitigation: 'Accelerated recruitment PCP', owner: 'Fatima Bukhari', status: 'Mitigated' },
  { id: 'risk-5', projectId: 'proj-3', risk: 'MEP trade certification gaps', probability: 'Low', impact: 'Medium', mitigation: 'Pre-mobilization training', owner: 'Hamza Sheikh', status: 'Open' },
  { id: 'risk-6', projectId: 'proj-3', risk: 'CC106 budget variance', probability: 'Medium', impact: 'Medium', mitigation: 'Monthly cost review with Finance', owner: 'Hassan Raza', status: 'Monitoring' },
  { id: 'risk-7', projectId: 'proj-4', risk: 'PCP approval delays', probability: 'Medium', impact: 'High', mitigation: 'SLA escalation to BU Head', owner: 'Usman Malik', status: 'Open' },
  { id: 'risk-8', projectId: 'proj-4', risk: 'Agency rate inflation', probability: 'Medium', impact: 'Medium', mitigation: 'In-house pool prioritization', owner: 'Ayesha Siddiqui', status: 'Open' },
  { id: 'risk-9', projectId: 'proj-1', risk: 'Cost center CC104 over budget', probability: 'High', impact: 'High', mitigation: 'Headcount freeze on non-critical roles', owner: 'Hassan Raza', status: 'Monitoring' },
  { id: 'risk-10', projectId: 'proj-2', risk: 'HSE compliance on night shifts', probability: 'Medium', impact: 'Critical', mitigation: 'Additional HSE officers', owner: 'Bilal Ahmed', status: 'Open' },
];

const issues = [
  { id: 'issue-1', projectId: 'proj-1', issue: '5 Electrician vacancies aged 45+ days', owner: 'Muhammad Imran', status: 'In Progress', resolution: 'PCP-2026-00041 in approval', priority: 'High' },
  { id: 'issue-2', projectId: 'proj-1', issue: 'CC104 projected 9% over budget', owner: 'Hassan Raza', status: 'Open', resolution: '', priority: 'High' },
  { id: 'issue-3', projectId: 'proj-2', issue: 'Welder mobilization shortfall', owner: 'Fatima Bukhari', status: 'Resolved', resolution: 'Agency contract signed', priority: 'High' },
  { id: 'issue-4', projectId: 'proj-2', issue: 'Rigger availability in Ruwais', owner: 'Hamza Sheikh', status: 'In Progress', resolution: 'Transfer from Logistics – South', priority: 'Critical' },
  { id: 'issue-5', projectId: 'proj-3', issue: 'MEP rough-in behind schedule', owner: 'Hamza Sheikh', status: 'Open', resolution: '', priority: 'Medium' },
  { id: 'issue-6', projectId: 'proj-3', issue: 'Electrician night-shift coverage gap', owner: 'Zainab Khattak', status: 'In Progress', resolution: 'Internal transfer from MEP – East', priority: 'Medium' },
  { id: 'issue-7', projectId: 'proj-4', issue: 'PCP draft pending submission', owner: 'Muhammad Imran', status: 'Open', resolution: '', priority: 'High' },
  { id: 'issue-8', projectId: 'proj-1', issue: 'SAP headcount sync pending', owner: 'Usman Malik', status: 'Resolved', resolution: 'Manual reconciliation completed', priority: 'High' },
  { id: 'issue-9', projectId: 'proj-2', issue: 'Finance approval SLA breach risk', owner: 'Hassan Raza', status: 'Resolved', resolution: 'Escalation sent', priority: 'Critical' },
  { id: 'issue-10', projectId: 'proj-5', issue: 'HSE audit findings', owner: 'Bilal Ahmed', status: 'Resolved', resolution: 'All critical findings remediated', priority: 'High' },
];

const leaves = [
  { id: 'leave-1', employeeId: 'emp-10', type: 'Sick Leave', startDate: '2025-05-20', endDate: '2025-06-05', days: 12, status: 'Approved', reason: 'Medical recovery' },
  { id: 'leave-2', employeeId: 'emp-5', type: 'Annual Leave', startDate: '2025-07-01', endDate: '2025-07-14', days: 10, status: 'Pending', reason: 'Summer vacation' },
  { id: 'leave-3', employeeId: 'emp-8', type: 'Annual Leave', startDate: '2025-08-01', endDate: '2025-08-07', days: 5, status: 'Pending', reason: 'Family trip' },
];

const attendanceStatuses = ['Present', 'Present', 'Present', 'Present', 'Late', 'Absent', 'On Leave', 'Half Day'];
const attendanceLocations = ['Site', 'Office', 'Remote'];
const attendance = [];
let attIdx = 1;
const today = new Date();
for (let d = 0; d < 14; d++) {
  const date = new Date(today);
  date.setDate(today.getDate() - d);
  const day = date.getDay();
  if (day === 0 || day === 6) continue;
  const dateStr = date.toISOString().slice(0, 10);
  for (const emp of employees) {
    const status = emp.id === 'emp-10' && d < 3
      ? 'On Leave'
      : randomItem(attendanceStatuses);
    const checkIn = status === 'Absent' || status === 'On Leave'
      ? null
      : `${status === 'Late' ? '09:' : '08:'}${String(randomInt(15, 45)).padStart(2, '0')}`;
    const checkOut = checkIn ? `17:${String(randomInt(0, 30)).padStart(2, '0')}` : null;
    const workHours = checkIn && checkOut
      ? Math.round((status === 'Half Day' ? 4 : status === 'Late' ? 7.5 : 8) * 10) / 10
      : 0;
    attendance.push({
      id: `att-${attIdx++}`,
      employeeId: emp.id,
      date: dateStr,
      checkIn,
      checkOut,
      status,
      workHours,
      location: randomItem(attendanceLocations),
      notes: status === 'Late' ? 'Traffic delay on site access road' : '',
      recordedBy: 'emp-4',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

const notifications = [
  { id: 'notif-1', type: 'task_assigned', title: 'New Task Assigned', message: 'You have been assigned: Site safety inspection', userId: 'emp-1', read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'notif-2', type: 'budget', title: 'Budget Warning', message: 'ADNOC Refinery Electrical Turnaround CC104 is projected 9% over budget by Sep', userId: 'all', read: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'notif-3', type: 'resource', title: 'Resource Overallocation', message: 'Fatima Bukhari is at 95% utilization', userId: 'all', read: false, createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: 'notif-4', type: 'task_overdue', title: 'Task Overdue', message: 'Welding procedure qualification is past due date', userId: 'emp-9', read: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'notif-5', type: 'leave', title: 'Leave Approved', message: 'Your sick leave request has been approved', userId: 'emp-10', read: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
];

const auditlogs = [
  { id: 'audit-1', action: 'BUDGET_CHANGE', entity: 'Project', entityId: 'proj-1', details: 'ADNOC Refinery Electrical Turnaround personnel budget revised after PCP Rev. 1', userId: 'emp-3', timestamp: new Date(Date.now() - 86400000).toISOString() },
  { id: 'audit-2', action: 'CREATE', entity: 'Task', entityId: 'task-1', details: 'Task created: Site safety inspection', userId: 'emp-1', timestamp: new Date(Date.now() - 172800000).toISOString() },
  { id: 'audit-3', action: 'UPDATE', entity: 'Project', entityId: 'proj-2', details: 'Ruwais Piping & Welding Package piping phase status updated', userId: 'emp-2', timestamp: new Date(Date.now() - 259200000).toISOString() },
  { id: 'audit-4', action: 'KANBAN_MOVE', entity: 'Task', entityId: 'task-5', details: 'Task moved from To Do to In Progress', userId: 'emp-6', timestamp: new Date(Date.now() - 43200000).toISOString() },
  { id: 'audit-5', action: 'CREATE', entity: 'PCP', entityId: 'pcp-1', details: 'PCP-2026-00041 submitted by Muhammad Imran', userId: 'emp-1', timestamp: new Date(Date.now() - 604800000).toISOString() },
];

async function prepareEmployeesWithPasswords() {
  return Promise.all(
    employees.map(async (emp) => ({
      ...emp,
      passwordHash: await hashPassword(defaultPasswordForEmployee(emp)),
    })),
  );
}

async function seed() {
  if (process.env.ALLOW_SEED !== 'true') {
    console.error(
      'Seeding is disabled. Set ALLOW_SEED=true in backend/.env only when you intentionally want to load demo data.',
    );
    process.exit(1);
  }

  await connectDB();

  const employeesWithAuth = await prepareEmployeesWithPasswords();

  const collections = {
    departments: { repo: repos.departments, data: departments },
    skills: { repo: repos.skills, data: skillsList },
    employees: { repo: repos.employees, data: employeesWithAuth },
    projects: { repo: repos.projects, data: projects },
    tasks: { repo: repos.tasks, data: tasks },
    timesheets: { repo: repos.timesheets, data: timesheets },
    budgets: { repo: repos.budgets, data: budgets },
    risks: { repo: repos.risks, data: risks },
    issues: { repo: repos.issues, data: issues },
    leaves: { repo: repos.leaves, data: leaves },
    attendance: { repo: repos.attendance, data: attendance },
    notifications: { repo: repos.notifications, data: notifications },
    auditlogs: { repo: repos.auditlogs, data: auditlogs },
    pcp_requests: { repo: repos.pcpRequests, data: pcpRequests },
    pcp_revisions: { repo: repos.pcpRevisions, data: pcpRevisions },
    pcp_approval_chains: { repo: repos.pcpApprovalChains, data: pcpApprovalChains },
    pcp_master_config: { repo: repos.pcpMasterConfig, data: [{ id: 'default', ...pcpMasters }] },
  };

  for (const [name, { repo, data }] of Object.entries(collections)) {
    try {
      await repo.replaceAll(data);
      console.log(`✓ ${name} (${data.length} records)`);
    } catch (err) {
      const hint = err.message?.includes('SSL') || err.message?.includes('tlsv1')
        ? '\n→ Fix: Atlas → Network Access → Add IP Address (0.0.0.0/0 for dev)'
        : '';
      throw new Error(`Failed seeding "${name}": ${err.message}${hint}`);
    }
  }

  await disconnectDB();
  console.log('\n✅ MongoDB seeded successfully!');
  console.log('\nDemo login (email / password):');
  console.log('  Requester  → requester@wms.demo / Requester@123');
  console.log('  Approver   → approver@wms.demo / Approver@123');
  console.log('  Admin      → admin@wms.demo / Admin@123');
  console.log('  Executive  → executive@wms.demo / Executive@123');
  console.log('  HR         → hr@wms.demo / Hr@123');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
