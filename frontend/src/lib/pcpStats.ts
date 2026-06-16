import type { PcpRequest } from '@/types'

export function vacantPositionCount(requests: PcpRequest[]) {
  return requests.reduce((sum, r) => {
    return sum + (r.positions?.reduce((s, p) => s + (p.vacant ?? Math.max(0, (p.count || 1) - (p.filled || 0))), 0) || 0)
  }, 0)
}

export const PCP_BUS_UNITS = [
  'Construction – North',
  'MEP – East',
  'Corporate HR',
  'Logistics – South',
]
