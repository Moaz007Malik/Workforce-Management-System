import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { Employee, Project, Task } from '@/types'

export interface ChatContext {
  lastMatchedProjectIds: string[]
  lastQueryDescription: string
}

interface ProjectDetailsResponse {
  project: Project
  tasks: Task[]
  assignedResources: Employee[]
  budget: {
    budget: number
    plannedCost: number
    actualCost: number
    remaining: number
    health: { status: string; consumption: number }
    profitability: { profit: number; margin: number }
  }
  progress: number
  risks: { risk: string; status: string }[]
  issues: { issue: string; status: string }[]
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'is', 'it', 'we', 'our', 'new', 'project',
  'this', 'that', 'with', 'have', 'has', 'will', 'be', 'about', 'need', 'want', 'i', 'my', 'me',
])

const KNOWN_SKILLS = [
  'React', 'Node.js', 'TypeScript', 'Python', 'AWS', 'UI/UX Design',
  'Project Management', 'DevOps', 'SQL', 'Agile/Scrum',
]

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s/.-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}

function scoreProject(project: Project, queryTokens: string[]): number {
  const corpus = `${project.name} ${project.client} ${project.description} ${project.priority}`.toLowerCase()
  const corpusTokens = new Set(tokenize(corpus))
  let score = 0
  for (const token of queryTokens) {
    if (corpus.includes(token)) score += 2
    if (corpusTokens.has(token)) score += 1
  }
  if (queryTokens.some((t) => project.name.toLowerCase().includes(t))) score += 3
  return score
}

function extractDescription(message: string): string {
  const lower = message.toLowerCase()
  const markers = ['description:', 'description is', 'about:', 'details:']
  for (const marker of markers) {
    const idx = lower.indexOf(marker)
    if (idx !== -1) return message.slice(idx + marker.length).trim()
  }
  if (lower.includes('new project')) {
    return message.replace(/new project[:\s-]*/i, '').trim()
  }
  return message.trim()
}

function extractSkills(message: string, employees: Employee[]): string[] {
  const found = new Set<string>()
  const lower = message.toLowerCase()
  const pool = [...new Set([...KNOWN_SKILLS, ...employees.flatMap((e) => e.skills || [])])]

  for (const skill of pool) {
    if (lower.includes(skill.toLowerCase())) found.add(skill)
  }

  const andMatch = message.match(/(?:with|having|know[s]?)\s+([^.?!]+)/i)
  if (andMatch) {
    andMatch[1].split(/,|\band\b/i).forEach((part) => {
      const trimmed = part.trim()
      if (trimmed.length > 1) {
        const match = pool.find((s) => s.toLowerCase() === trimmed.toLowerCase())
        if (match) found.add(match)
      }
    })
  }

  return [...found]
}

function findProjectByName(projects: Project[], message: string): Project | undefined {
  const lower = message.toLowerCase()
  return projects.find(
    (p) => lower.includes(p.name.toLowerCase()) || lower.includes(p.client.toLowerCase())
  )
}

function isProjectMatchIntent(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('new project') ||
    lower.includes('similar project') ||
    lower.includes('done anything') ||
    lower.includes('related to') ||
    lower.includes('match') ||
    (lower.includes('description') && message.length > 40)
  )
}

function isDetailsIntent(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('give me details') ||
    lower.includes('show details') ||
    lower.includes('full details') ||
    lower.includes('tell me more') ||
    lower.includes('project details') ||
    lower === 'details' ||
    lower.includes('more info')
  )
}

function isEmployeeSkillIntent(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('employee') ||
    lower.includes('employees') ||
    lower.includes('who has') ||
    lower.includes('with skill') ||
    lower.includes('with these skills') ||
    lower.includes('resources with')
  ) && (
    lower.includes('skill') ||
    KNOWN_SKILLS.some((s) => lower.includes(s.toLowerCase())) ||
    lower.includes('react') ||
    lower.includes('python') ||
    lower.includes('node')
  )
}

function formatProjectMatch(projects: Project[], scores: Map<string, number>): string {
  if (!projects.length) {
    return 'I could not find any related past projects in your portfolio. You may be entering new territory — consider planning resources and budget from scratch.'
  }

  const lines = [
    'I found related work in your portfolio:',
    '',
  ]

  projects.forEach((p, i) => {
    const score = scores.get(p.id) || 0
    lines.push(
      `${i + 1}. **${p.name}** (${p.client})`,
      `   Status: ${p.status} · Priority: ${p.priority}`,
      `   ${p.description.slice(0, 120)}${p.description.length > 120 ? '...' : ''}`,
      `   Match strength: ${score >= 6 ? 'Strong' : score >= 3 ? 'Moderate' : 'Partial'}`,
      '',
    )
  })

  lines.push('Say **"give me details"** for the top match, or **"give me details about [project name]"** for a specific one.')
  return lines.join('\n')
}

async function formatProjectDetails(projectId: string): Promise<string> {
  const [data, utilMap] = await Promise.all([
    api.get<ProjectDetailsResponse>(`/projects/${projectId}/details`),
    fetchUtilizationMap(),
  ])
  const { project, budget, progress, tasks, risks, issues } = data
  const assignedResources = data.assignedResources.map((e) => enrichEmployee(e, utilMap))

  const skillSet = new Set<string>()
  assignedResources.forEach((e) => e.skills?.forEach((s) => skillSet.add(s)))
  tasks.forEach((t) => t.requiredSkills?.forEach((s) => skillSet.add(s)))

  const lines = [
    `**${project.name}** (${project.projectId})`,
    `Client: ${project.client}`,
    `Status: ${project.status} · Priority: ${project.priority} · Progress: ${progress}%`,
    `PM: ${project.projectManager}`,
    `Timeline: ${project.startDate} → ${project.endDate}`,
    '',
    '**Description**',
    project.description,
    '',
    '**Financials**',
    `Budget: ${formatCurrency(budget.budget)}`,
    `Planned cost: ${formatCurrency(budget.plannedCost)}`,
    `Actual cost: ${formatCurrency(budget.actualCost)}`,
    `Remaining: ${formatCurrency(budget.remaining)} (${budget.health.consumption}% consumed · ${budget.health.status})`,
    `Revenue: ${formatCurrency(project.revenue)}`,
    `Profit margin: ${budget.profitability.margin}%`,
    '',
    '**Skills involved**',
    skillSet.size ? [...skillSet].join(', ') : 'No skills recorded',
    '',
    '**Assigned resources**',
  ]

  if (!assignedResources.length) {
    lines.push('No resources assigned yet.')
  } else {
    assignedResources.forEach((e) => {
      const remaining = e.availability ?? Math.max(0, (e.capacityHours || 40) - (e.allocatedHours || 0))
      lines.push(
        `• ${e.fullName} (${e.designation})`,
        `  Skills: ${e.skills?.join(', ') || '—'}`,
        `  Capacity: ${e.capacityHours}h/wk · Allocated: ${e.allocatedHours ?? 0}h · Available: ${remaining}h · Utilization: ${e.utilization ?? 0}%`,
      )
    })
  }

  lines.push('', `**Tasks:** ${tasks.length} total`)
  if (risks.length) lines.push(`**Risks:** ${risks.length} open/monitoring`)
  if (issues.length) lines.push(`**Issues:** ${issues.length} tracked`)

  return lines.join('\n')
}

interface UtilizationRow {
  id: string
  utilization: number
  allocatedHours: number
  capacityHours: number
}

async function fetchUtilizationMap(): Promise<Map<string, UtilizationRow>> {
  const dashboard = await api.get<{ resourceUtilization: UtilizationRow[] }>('/dashboard')
  return new Map(dashboard.resourceUtilization.map((u) => [u.id, u]))
}

function enrichEmployee(e: Employee, utilMap: Map<string, UtilizationRow>): Employee {
  const util = utilMap.get(e.id)
  if (!util) return e
  const remaining = Math.max(0, util.capacityHours - util.allocatedHours)
  return {
    ...e,
    capacityHours: util.capacityHours,
    allocatedHours: util.allocatedHours,
    utilization: util.utilization,
    availability: e.availability ?? remaining,
  }
}

function formatEmployeesBySkills(employees: Employee[], skills: string[]): string {
  if (!skills.length) {
    return 'Please mention the skills you need, e.g. "Show employees with React and TypeScript".'
  }

  const matched = employees.filter((e) =>
    skills.every((skill) =>
      e.skills?.some((s) => s.toLowerCase() === skill.toLowerCase())
    )
  )

  if (!matched.length) {
    return `No employees have all of these skills: ${skills.join(', ')}.\n\nTry asking with fewer skills or check the HR directory.`
  }

  const lines = [
    `Employees with **${skills.join(', ')}**:`,
    '',
  ]

  matched.forEach((e) => {
    const remaining = e.availability ?? Math.max(0, (e.capacityHours || 40) - (e.allocatedHours || 0))
    lines.push(
      `**${e.fullName}** · ${e.designation} (${e.department})`,
      `Status: ${e.status}`,
      `Skills: ${e.skills?.join(', ')}`,
      `Weekly capacity: ${e.capacityHours}h`,
      `Allocated: ${e.allocatedHours ?? 0}h · Remaining: ${remaining}h`,
      `Utilization: ${e.utilization ?? 0}%`,
      `Hourly rate: ${formatCurrency(e.hourlyRate)}`,
      '',
    )
  })

  return lines.join('\n')
}

export const CHATBOT_NAME = 'CORVI - The AI Assistant'

function mdTable(rows: Record<string, string | number>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  return [
    '',
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((h) => String(row[h] ?? '')).join(' | ')} |`),
  ].join('\n')
}

/** Rule-based answers for main-dashboard suggested questions (no API / LLM). */
export function tryDashboardFaq(message: string): { matched: boolean; reply: string } {
  const lower = message.trim().toLowerCase()
  if (!lower) return { matched: false, reply: '' }

  if (
    lower.includes('summarize all active') ||
    (lower.includes('active') && lower.includes('project') && (lower.includes('budget') || lower.includes('summarize')))
  ) {
    const rows = [
      { Project: 'ADNOC Refinery Electrical Turnaround', Client: 'ADNOC Refinery', Budget: formatCurrency(8200000), Status: 'Active' },
      { Project: 'Ruwais Piping & Welding Package', Client: 'ADNOC Piping', Budget: formatCurrency(5400000), Status: 'Active' },
      { Project: 'Ruwais MEP Campus Build', Client: 'Ruwais MEP Campus', Budget: formatCurrency(3100000), Status: 'Active' },
    ]
    return {
      matched: true,
      reply: [
        '## Active Projects & Budgets',
        '',
        '**3** active projects in the Descon portfolio.',
        mdTable(rows),
        '',
        `**Combined budget:** ${formatCurrency(16700000)} · **Combined revenue:** ${formatCurrency(19500000)}`,
        '',
        '_Source: Descon project database · Jun 2026_',
      ].join('\n'),
    }
  }

  if (
    lower.includes('react') &&
    (lower.includes('skill') || lower.includes('employee') || lower.includes('database') || lower.includes('show'))
  ) {
    const rows = [
      {
        Name: 'Usman Malik',
        ID: 'DSC004',
        Designation: 'HR Systems Admin',
        Department: 'Corporate HR',
        Skills: 'Project Management, Logistics, React, TypeScript',
        Status: 'Allocated',
      },
    ]
    return {
      matched: true,
      reply: [
        '## Employees with React Skills',
        '',
        '**1** employee in the HR database lists **React** on their profile.',
        mdTable(rows),
        '',
        'Usman supports HR systems development alongside PCP admin workflows.',
        '',
        '_Source: HR employee database · Jun 2026_',
      ].join('\n'),
    }
  }

  if (lower.includes('over budget') && lower.includes('project')) {
    const rows = [
      {
        Project: 'ADNOC Refinery Electrical Turnaround',
        Budget: formatCurrency(8200000),
        'Actual (YTD)': formatCurrency(5740000),
        'Projected EOY': formatCurrency(8938000),
        Variance: '+9% (CC104)',
      },
      {
        Project: 'Ruwais MEP Campus Build',
        Budget: formatCurrency(3100000),
        'Actual (YTD)': formatCurrency(2480000),
        'Projected EOY': formatCurrency(3255000),
        Variance: '+5%',
      },
    ]
    return {
      matched: true,
      reply: [
        '## Projects Over Budget',
        '',
        '**2** projects are tracking above budget for H2 2026.',
        mdTable(rows),
        '',
        '**ADNOC Refinery Electrical Turnaround** is the highest risk — CC104 projected **+9%** by Sep due to night-shift electrician revisions.',
        '',
        '_Source: Budget vs actual · approved PCP costing · Jun 2026_',
      ].join('\n'),
    }
  }

  if (lower.includes('pending') && lower.includes('approv')) {
    const rows = [
      {
        'PCP No': 'PCP-2026-00041',
        Client: 'ADNOC Refinery Electrical Turnaround',
        Stage: 'Finance Manager',
        Priority: 'Critical',
        SLA: '14h remaining',
      },
    ]
    return {
      matched: true,
      reply: [
        '## Pending Approval Items',
        '',
        '**1** PCP awaiting approval in your queue.',
        mdTable(rows),
        '',
        'Rev. 2 reallocated electrician cost centers (CC103 → CC106). Night-shift electrician vacancy is **48 days** aged.',
        '',
        '_Source: PCP approval queue · Jun 2026_',
      ].join('\n'),
    }
  }

  return { matched: false, reply: '' }
}

function welcomeMessage(): string {
  return `Hi! I'm **${CHATBOT_NAME}**. Ask me about projects, budgets, or team skills.`
}

function helpMessage(): string {
  return [
    'Here\'s what I understand:',
    '',
    '• **Active projects** — "Summarize all active projects and their budgets"',
    '• **React skills** — "Show employees with React skills in our database"',
    '• **Over budget** — "Which projects are over budget?"',
    '• **Approvals** — "List pending approval items"',
    '• **New project matching** — include "new project" or paste a short description',
    '• **Details** — say "give me details" after a match, or name a project',
  ].join('\n')
}

export async function processChatMessage(
  message: string,
  context: ChatContext
): Promise<{ reply: string; context: ChatContext }> {
  const trimmed = message.trim()
  if (!trimmed) return { reply: 'Please type a message.', context }

  const lower = trimmed.toLowerCase()
  if (lower === 'help' || lower === 'hi' || lower === 'hello') {
    return { reply: welcomeMessage(), context }
  }

  const faq = tryDashboardFaq(trimmed)
  if (faq.matched) {
    return { reply: faq.reply, context }
  }

  const [projects, employees] = await Promise.all([
    api.get<Project[]>('/projects'),
    api.get<Employee[]>('/employees'),
  ])

  if (isEmployeeSkillIntent(trimmed)) {
    const skills = extractSkills(trimmed, employees)
    const utilMap = await fetchUtilizationMap()
    const enriched = employees.map((e) => enrichEmployee(e, utilMap))
    return {
      reply: formatEmployeesBySkills(enriched, skills),
      context,
    }
  }

  if (isDetailsIntent(trimmed)) {
    let projectId = context.lastMatchedProjectIds[0]
    const byName = findProjectByName(projects, trimmed)
    if (byName) projectId = byName.id

    if (!projectId) {
      return {
        reply: 'Which project? Describe a new project first, or say "give me details about Mobile App Redesign".',
        context,
      }
    }

    const reply = await formatProjectDetails(projectId)
    return {
      reply,
      context: { ...context, lastMatchedProjectIds: [projectId, ...context.lastMatchedProjectIds.filter((id) => id !== projectId)] },
    }
  }

  if (isProjectMatchIntent(trimmed) || trimmed.length > 50) {
    const description = extractDescription(trimmed)
    const queryTokens = tokenize(description)
    const scored = projects
      .map((p) => ({ project: p, score: scoreProject(p, queryTokens) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    const scores = new Map(scored.map((x) => [x.project.id, x.score]))
    const matched = scored.map((x) => x.project)

    const reply = [
      'Thanks — here\'s what I found based on your description:',
      '',
      `_"${description.slice(0, 200)}${description.length > 200 ? '...' : ''}"_`,
      '',
      formatProjectMatch(matched, scores),
    ].join('\n')

    return {
      reply,
      context: {
        lastQueryDescription: description,
        lastMatchedProjectIds: matched.map((p) => p.id),
      },
    }
  }

  if (lower.includes('help')) {
    return { reply: helpMessage(), context }
  }

  return {
    reply: [
      'I\'m not sure how to answer that yet.',
      '',
      helpMessage(),
    ].join('\n'),
    context,
  }
}

export function getInitialChatMessage(): string {
  return welcomeMessage()
}
