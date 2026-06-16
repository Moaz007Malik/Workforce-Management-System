import type { Employee, Project } from '@/types'

export interface PcpHeaderDefaults {
  client: string
  clientLocation: string
  businessUnit: string
  priority: string
  requiredByDate: string
  wbs: string
}

const PCP_LOCATIONS = ['Abu Dhabi', 'Dubai', 'Ruwais', 'Other'] as const

function inferClientLocation(project: Project): string {
  const text = `${project.client} ${project.description} ${project.name}`.toLowerCase()
  if (text.includes('ruwais')) return 'Ruwais'
  if (text.includes('dubai')) return 'Dubai'
  if (text.includes('abu dhabi') || text.includes('adnoc')) return 'Abu Dhabi'
  return 'Abu Dhabi'
}

function mapProjectPriority(priority: string): string {
  const p = priority?.toLowerCase() ?? ''
  if (p === 'high' || p === 'critical') return 'Urgent'
  if (p === 'low') return 'Normal'
  return 'Normal'
}

function nearestMilestoneDate(project: Project): string | null {
  const dates: string[] = []
  for (const phase of project.phases ?? []) {
    for (const ms of phase.milestones ?? []) {
      if (ms.dueDate) dates.push(ms.dueDate)
    }
  }
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = dates.filter((d) => d >= today).sort()
  return upcoming[0] ?? dates.sort().at(-1) ?? null
}

function defaultRequiredByDate(project: Project): string {
  const milestone = nearestMilestoneDate(project)
  const fallback = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10)
  const candidate = milestone || fallback
  if (project.endDate && candidate > project.endDate) return project.endDate
  return candidate
}

export function getPcpDefaultsFromProject(
  project: Project,
  pm?: Employee | null,
  wbsByBu?: Record<string, string[]>,
): PcpHeaderDefaults {
  const businessUnit = pm?.businessUnit || pm?.department || 'Construction – North'
  const wbsOptions = wbsByBu?.[businessUnit] ?? []
  const location = inferClientLocation(project)
  const clientLocation = PCP_LOCATIONS.includes(location as (typeof PCP_LOCATIONS)[number])
    ? location
    : 'Other'

  return {
    client: project.name,
    clientLocation,
    businessUnit,
    priority: mapProjectPriority(project.priority),
    requiredByDate: defaultRequiredByDate(project),
    wbs: wbsOptions[0] ?? '',
  }
}
