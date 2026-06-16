import type { PcpPosition } from '@/types'

export function calcPositionMonthly(pos: PcpPosition): number {
  const benefits = (pos.benefits || []).reduce((s, b) => s + (b.amount || 0), 0)
  return (pos.proposedSalary || 0) + benefits
}

export function calcPositionTotal(pos: PcpPosition): number {
  const monthly = calcPositionMonthly(pos)
  const months = pos.contractDuration === 'Open-ended' ? 12 : parseInt(pos.contractDuration || '12', 10)
  return monthly * months * (pos.count || 1)
}

export function chargingTotal(pos: PcpPosition): number {
  return (pos.costCenters || []).reduce((s, c) => s + (c.percent || 0), 0)
}

const DEFAULT_BENEFIT_AMOUNTS: Record<string, number> = {
  Housing: 2000,
  Transport: 800,
  Medical: 500,
  Insurance: 400,
  'Visa/Iqama': 1200,
}

export function defaultBenefitAmount(name: string): number {
  return DEFAULT_BENEFIT_AMOUNTS[name] ?? 800
}

export function isBandBreach(pos: PcpPosition, bandMin: number, bandMax: number): boolean {
  return (pos.proposedSalary || 0) > bandMax || (pos.proposedSalary || 0) < bandMin
}

export function emptyPosition(): PcpPosition {
  return {
    title: '',
    jobFamily: '',
    grade: '',
    count: 1,
    employmentType: 'Permanent',
    shift: 'Day',
    workLocation: 'Site',
    plannedStart: '',
    proposedSalary: 0,
    benefits: [],
    contractDuration: '12',
    noticePeriod: '30',
    costCenters: [{ code: 'CC305', percent: 60 }, { code: 'CC103', percent: 40 }],
  }
}
