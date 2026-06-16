import type { PcpPosition } from '@/types'
import { chargingTotal, isBandBreach } from '@/lib/pcpCalculations'

export interface HeaderForm {
  client: string
  clientLocation: string
  recruitmentType: string
  issueDate: string
  requiredByDate: string
  businessUnit: string
  wbs: string
}

export function validateHeader(header: HeaderForm): string[] {
  const errors: string[] = []
  if (!header.client) errors.push('Company / Client Name is required')
  if (!header.clientLocation) errors.push('Client Location is required')
  if (!header.recruitmentType) errors.push('Type of Recruitment is required')
  if (!header.issueDate) errors.push('PCP Issue Date is required')
  if (!header.requiredByDate) errors.push('Required-By Date is required')
  if (header.issueDate && header.requiredByDate && header.requiredByDate <= header.issueDate) {
    errors.push('Required-By Date must be after Issue Date')
  }
  if (!header.businessUnit) errors.push('Business Unit / Department is required')
  if (!header.wbs) errors.push('Project / WBS is required')
  return errors
}

export function validatePositions(positions: PcpPosition[]): string[] {
  const errors: string[] = []
  if (!positions.length) errors.push('At least one position is required')
  positions.forEach((p, i) => {
    const n = i + 1
    if (!p.title) errors.push(`Position ${n}: Title is required`)
    if (!p.jobFamily) errors.push(`Position ${n}: Job Family is required`)
    if (!p.grade) errors.push(`Position ${n}: Grade / Band is required`)
    if (!p.count || p.count < 1) errors.push(`Position ${n}: No. of Positions must be at least 1`)
    if (!p.employmentType) errors.push(`Position ${n}: Employment Type is required`)
    if (!p.shift) errors.push(`Position ${n}: Shift is required`)
    if (!p.workLocation) errors.push(`Position ${n}: Work Location is required`)
    if (!p.plannedStart) errors.push(`Position ${n}: Planned Start Date is required`)
    if (p.plannedDemob && p.plannedStart && p.plannedDemob <= p.plannedStart) {
      errors.push(`Position ${n}: Demobilization must be after Start Date`)
    }
  })
  return errors
}

export function validateCosting(
  positions: PcpPosition[],
  grades: { code: string; bandMin: number; bandMax: number }[]
): string[] {
  const errors: string[] = []
  positions.forEach((p, i) => {
    const n = i + 1
    if (!p.proposedSalary || p.proposedSalary <= 0) errors.push(`Position ${n}: Proposed Salary is required`)
    if (!p.contractDuration) errors.push(`Position ${n}: Contract Duration is required`)
    if (!p.noticePeriod) errors.push(`Position ${n}: Notice Period is required`)
    const grade = grades.find((g) => g.code === p.grade)
    if (grade && isBandBreach(p, grade.bandMin, grade.bandMax) && !p.bandBreachJustification?.trim()) {
      errors.push(`Position ${n}: Band breach justification is required`)
    }
    const charge = chargingTotal(p)
    if (charge !== 100) errors.push(`Position ${n}: Cost center charging must total 100% (currently ${charge}%)`)
    if (!p.costCenters[0]?.code) errors.push(`Position ${n}: Cost Center 1 is required`)
  })
  return errors
}
