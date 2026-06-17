import type { ReactNode } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { cn } from '@/lib/utils'

export const ATTENDANCE_COLORS: Record<string, string> = {
  Present: '#10b981',
  Absent: '#ef4444',
  Late: '#f59e0b',
  'Half Day': '#8b5cf6',
  'On Leave': '#94a3b8',
}

export const TIMESHEET_COLORS: Record<string, string> = {
  Approved: '#10b981',
  Pending: '#f59e0b',
  Rejected: '#ef4444',
}

export const CHART_PALETTE = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '10px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '8px 12px',
}

export const chartAxisProps = {
  tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' },
  stroke: 'hsl(var(--border))',
  axisLine: false,
  tickLine: false,
}

interface ChartTooltipPayloadItem {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string
  payload?: Record<string, unknown>
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: ChartTooltipPayloadItem[]
  label?: string
  formatter?: (value: number, name: string) => [string, string]
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={chartTooltipStyle} className="space-y-1">
      {label && <p className="font-medium text-foreground">{label}</p>}
      {payload.map((entry) => {
        const raw = Number(entry.value ?? 0)
        const [display, name] = formatter
          ? formatter(raw, String(entry.name ?? entry.dataKey ?? ''))
          : [String(entry.value), String(entry.name ?? '')]
        return (
          <div key={`${entry.name}-${entry.dataKey}`} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
              {name}
            </span>
            <span className="font-semibold tabular-nums text-foreground">{display}</span>
          </div>
        )
      })}
    </div>
  )
}

export function ChartGradientDefs() {
  return (
    <defs>
      <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>
      <linearGradient id="gradOnLeave" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#cbd5e1" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
      <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="gradPrimary" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
      <linearGradient id="gradHours" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.2} />
      </linearGradient>
    </defs>
  )
}

interface DistributionItem {
  status: string
  count: number
}

export function DistributionLegend({
  data,
  colors,
  className,
}: {
  data: DistributionItem[]
  colors: Record<string, string>
  className?: string
}) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return null
  return (
    <ul className={cn('space-y-2.5', className)}>
      {data.map((item) => {
        const pct = Math.round((item.count / total) * 100)
        const color = colors[item.status] || CHART_PALETTE[0]
        return (
          <li key={item.status} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                {item.status}
              </span>
              <span className="font-medium tabular-nums text-foreground">
                {item.count}
                <span className="ml-1 text-muted-foreground">({pct}%)</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function DonutChart({
  data,
  colors,
  centerValue,
  centerLabel,
  height = 200,
  innerRadius = 58,
  outerRadius = 82,
}: {
  data: DistributionItem[]
  colors: Record<string, string>
  centerValue: string | number
  centerLabel: string
  height?: number
  innerRadius?: number
  outerRadius?: number
}) {
  const filtered = data.filter((d) => d.count > 0)
  if (filtered.length === 0) return null

  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filtered}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            dataKey="count"
            nameKey="status"
            stroke="none"
            animationDuration={600}
          >
            {filtered.map((entry) => (
              <Cell key={entry.status} fill={colors[entry.status] || CHART_PALETTE[0]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => (
              <ChartTooltipContent
                active={active}
                payload={payload as unknown as ChartTooltipPayloadItem[]}
                label={String(payload?.[0]?.name ?? '')}
              />
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums tracking-tight">{centerValue}</span>
        <span className="text-xs text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  )
}

export function MiniStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function ChartEmpty({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center">
      {icon}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0
}
