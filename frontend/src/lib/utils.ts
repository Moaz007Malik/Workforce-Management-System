import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const aedFormatter = new Intl.NumberFormat('en-AE', {
  style: 'currency',
  currency: 'AED',
  maximumFractionDigits: 0,
})

export function formatCurrency(amount: number): string {
  if (Number.isNaN(amount)) return aedFormatter.format(0)
  return aedFormatter.format(amount)
}

/** @deprecated Use formatCurrency — all amounts are AED */
export const formatAed = formatCurrency

/** Compact axis labels for charts, e.g. "AED 120k" */
export function formatCurrencyCompact(amount: number): string {
  if (Math.abs(amount) >= 1000) {
    return `AED ${(amount / 1000).toFixed(0)}k`
  }
  return formatCurrency(amount)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    Completed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    'On Hold': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    Cancelled: 'bg-red-500/10 text-red-600 dark:text-red-400',
    Draft: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    Planned: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    Available: 'bg-emerald-500/10 text-emerald-600',
    Allocated: 'bg-blue-500/10 text-blue-600',
    'Fully Allocated': 'bg-amber-500/10 text-amber-600',
    'On Leave': 'bg-orange-500/10 text-orange-600',
    Approved: 'bg-emerald-500/10 text-emerald-600',
    Pending: 'bg-amber-500/10 text-amber-600',
    Rejected: 'bg-red-500/10 text-red-600',
    Present: 'bg-emerald-500/10 text-emerald-600',
    Absent: 'bg-red-500/10 text-red-600',
    Late: 'bg-amber-500/10 text-amber-600',
    'Half Day': 'bg-blue-500/10 text-blue-600',
    green: 'bg-emerald-500/10 text-emerald-600',
    yellow: 'bg-amber-500/10 text-amber-600',
    red: 'bg-red-500/10 text-red-600',
  }
  return colors[status] || 'bg-gray-500/10 text-gray-600'
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    Low: 'bg-gray-500/10 text-gray-600',
    Medium: 'bg-blue-500/10 text-blue-600',
    High: 'bg-amber-500/10 text-amber-600',
    Critical: 'bg-red-500/10 text-red-600',
  }
  return colors[priority] || colors.Medium
}
