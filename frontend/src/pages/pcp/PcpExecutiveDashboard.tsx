import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  CartesianGrid, PieChart, Pie, Cell, ComposedChart, Legend,
} from 'recharts'
import { AlertTriangle, Flag } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePcpStore } from '@/stores/usePcpStore'
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import { useThemeColors } from '@/lib/useThemeColors'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const PIE_COLORS = ['#2A6EBB', '#E31E24', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#64748b']
const AGE_BUCKETS = ['d0_15', 'd16_30', 'd31_60', 'd60plus'] as const
const AGE_LABELS: Record<(typeof AGE_BUCKETS)[number], string> = {
  d0_15: '0–15d',
  d16_30: '16–30d',
  d31_60: '31–60d',
  d60plus: '60+d',
}

type AgeBucket = (typeof AGE_BUCKETS)[number]

interface DrillDown {
  title: string
  body: string
  actionLabel?: string
  actionPath?: string
}

function monthIndex(label: string) {
  return MONTHS.indexOf(label)
}

/** Older buckets render deeper red — spec: jitni purani utna dark red */
function heatColor(value: number, bucket: AgeBucket): string {
  if (value === 0) return 'bg-muted/25 text-muted-foreground/40'
  const bucketShades: Record<AgeBucket, string[]> = {
    d0_15: ['bg-emerald-200/80', 'bg-emerald-300/90', 'bg-emerald-400/90 text-white'],
    d16_30: ['bg-amber-200/80', 'bg-amber-400/70', 'bg-amber-500/80 text-white'],
    d31_60: ['bg-orange-300/70', 'bg-orange-500/75 text-white', 'bg-orange-600/85 text-white'],
    d60plus: ['bg-red-500/65 text-white', 'bg-red-600/80 text-white', 'bg-red-800 text-white'],
  }
  const tier = value >= 5 ? 2 : value >= 3 ? 1 : 0
  return bucketShades[bucket][tier]
}

function WidgetShell({
  title,
  hint,
  children,
  className,
}: {
  title: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {hint && <CardDescription className="text-xs">{hint}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function PcpExecutiveDashboard() {
  const navigate = useNavigate()
  const { executive, fetchExecutive } = usePcpStore()
  const { accentFill, primaryFill } = useThemeColors()
  const [project, setProject] = useState('All')
  const [businessUnit, setBusinessUnit] = useState('All')
  const [costCenter, setCostCenter] = useState('All')
  const [period, setPeriod] = useState('YTD')
  const [geography, setGeography] = useState('All')
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null)

  useEffect(() => { fetchExecutive() }, [fetchExecutive])

  const raw = executive as Record<string, unknown> | null
  const filters = raw?.filters as {
    projects?: string[]
    businessUnits?: string[]
    costCenters?: string[]
    geographies?: string[]
    periods?: string[]
  } | undefined

  const scale = period === 'This Month' ? 0.25 : period === 'This Quarter' ? 0.5 : 1

  const filtered = useMemo(() => {
    if (!raw) return null
    const matchBu = (row: { businessUnit?: string }) => businessUnit === 'All' || row.businessUnit === businessUnit
    const matchGeo = (row: { geography?: string }) => geography === 'All' || row.geography === geography
    const matchProject = (row: { project?: string }) => project === 'All' || row.project === project || row.project?.includes(project.split(' ')[0])
    const matchCc = (row: { costCenter?: string }) => costCenter === 'All' || row.costCenter === costCenter

    const headcountByProject = ((raw.headcountByProject as { project: string; filled: number; vacant: number; businessUnit?: string; geography?: string }[]) || [])
      .filter((r) => matchBu(r) && matchGeo(r) && (project === 'All' || r.project === project))

    const budgetVsActual = ((raw.budgetVsActual as { costCenter: string; budget: number; actual: number; businessUnit?: string; project?: string }[]) || [])
      .filter((r) => matchBu(r) && matchProject(r) && matchCc(r))
      .map((r) => ({
        ...r,
        budget: Math.round(r.budget * scale),
        actual: Math.round(r.actual * scale),
        overBudget: r.actual > r.budget,
        variancePct: r.budget ? Math.round(((r.actual - r.budget) / r.budget) * 100) : 0,
      }))

    const vacancyAgeing = ((raw.vacancyAgeing as { trade: string; d0_15: number; d16_30: number; d31_60: number; d60plus: number; businessUnit?: string; geography?: string }[]) || [])
      .filter((r) => matchBu(r) && matchGeo(r))

    const timeToFill = ((raw.timeToFill as { geography: string; days: number; businessUnit?: string }[]) || [])
      .filter((r) => matchGeo(r) && matchBu(r))

    const chargingDistribution = ((raw.chargingDistribution as { name: string; value: number; businessUnit?: string; project?: string }[]) || [])
      .filter((r) => matchBu(r) && (project === 'All' || r.project === project || r.project === 'All'))
      .map((r) => ({ ...r, value: Math.round(r.value * scale) }))

    const deploymentTimeline = ((raw.deploymentTimeline as { role: string; project: string; startMonth: string; endMonth: string; demob: boolean; businessUnit?: string; geography?: string }[]) || [])
      .filter((r) => matchBu(r) && matchGeo(r) && (project === 'All' || r.project.includes(project.split(' ')[0])))

    const hiringSourceMix = ((raw.hiringSourceMix as { source: string; count: number; cost: number; businessUnit?: string }[]) || [])
      .filter((r) => matchBu(r))
      .map((r) => ({ ...r, count: Math.round(r.count * scale), cost: Math.round(r.cost * scale) }))

    const hc = raw.headcount as { total: number; filled: number; vacant: number; onHold: number } | undefined
    const filledSum = headcountByProject.reduce((s, r) => s + r.filled, 0)
    const vacantSum = headcountByProject.reduce((s, r) => s + r.vacant, 0)
    const headcount = hc ? {
      total: project === 'All' && businessUnit === 'All' ? Math.round(hc.total * scale) : filledSum + vacantSum,
      filled: filledSum || Math.round(hc.filled * scale),
      vacant: vacantSum || Math.round(hc.vacant * scale),
      onHold: Math.round((hc.onHold || 0) * scale),
    } : undefined

    const approvalTat = raw.approvalTat as { avgDays: number; trend: number } | undefined
    const approvalTatTrend = ((raw.approvalTatTrend as { period: string; days: number }[]) || [])
      .slice(period === 'This Month' ? -1 : period === 'This Quarter' ? -3 : undefined)

    const nationalityBreakdown = ((raw.nationalityBreakdown as { nationality: string; value: number }[]) || [])
      .map((r) => ({ ...r, value: Math.round(r.value * scale) }))

    return {
      headcount,
      headcountByProject,
      budgetVsActual,
      vacancyAgeing,
      timeToFill,
      chargingDistribution,
      deploymentTimeline,
      hiringSourceMix,
      nationalityBreakdown,
      approvalTat,
      approvalTatTrend,
      alerts: raw.alerts as string[],
    }
  }, [raw, project, businessUnit, costCenter, period, geography, scale])

  const ganttData = useMemo(() => {
    if (!filtered?.deploymentTimeline) return []
    return filtered.deploymentTimeline.map((row) => ({
      ...row,
      label: `${row.role} · ${row.project}`,
      start: monthIndex(row.startMonth),
      span: Math.max(1, monthIndex(row.endMonth) - monthIndex(row.startMonth) + 1),
    }))
  }, [filtered?.deploymentTimeline])

  const chargingTotal = useMemo(
    () => filtered?.chargingDistribution?.reduce((s, r) => s + r.value, 0) ?? 0,
    [filtered?.chargingDistribution],
  )

  const filterSummary = [project, businessUnit, costCenter, period, geography].filter((v) => v !== 'All').join(' · ') || 'All filters'

  if (!filtered) return <p className="text-muted-foreground">Loading executive dashboard...</p>

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Executive Dashboard</h1>
        <p className="text-muted-foreground">
          {filterSummary} · click any chart for drill-down
        </p>
      </div>

      {/* Filter bar */}
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Project</label>
          <Select value={project} onChange={(e) => setProject(e.target.value)}>
            {(filters?.projects || ['All']).map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Business Unit</label>
          <Select value={businessUnit} onChange={(e) => setBusinessUnit(e.target.value)}>
            {(filters?.businessUnits || ['All']).map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Cost Center</label>
          <Select value={costCenter} onChange={(e) => setCostCenter(e.target.value)}>
            {(filters?.costCenters || ['All']).map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Period</label>
          <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {(filters?.periods || ['This Month', 'This Quarter', 'YTD', 'Custom']).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Geography</label>
          <Select value={geography} onChange={(e) => setGeography(e.target.value)}>
            {(filters?.geographies || ['All']).map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
      </div>

      {/* Widget 1 — Total Headcount KPI row (4 cards) */}
      <WidgetShell title="Total Headcount" hint="KPI cards row">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ['Total', filtered.headcount?.total, ''],
            ['Filled', filtered.headcount?.filled, 'text-emerald-600'],
            ['Vacant', filtered.headcount?.vacant, 'text-amber-600'],
            ['On Hold', filtered.headcount?.onHold, 'text-muted-foreground'],
          ] as const).map(([label, value, color]) => (
            <button
              key={label}
              type="button"
              className="rounded-lg border border-border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40"
              onClick={() => setDrillDown({
                title: `${label} Headcount`,
                body: `${label}: ${value?.toLocaleString()} positions under current filters (${filterSummary}).`,
                actionLabel: 'View all PCPs',
                actionPath: '/pcp/all',
              })}
            >
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className={cn('text-3xl font-bold', color)}>{value?.toLocaleString()}</p>
            </button>
          ))}
        </div>
      </WidgetShell>

      {/* Widgets 2–9 — chart grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Widget 2 */}
        <WidgetShell title="Headcount by Project" hint="Bar chart · click a bar to drill down">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filtered.headcountByProject}>
                <XAxis dataKey="project" fontSize={10} interval={0} angle={-12} textAnchor="end" height={60} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar
                  dataKey="filled"
                  fill={accentFill}
                  name="Filled"
                  cursor="pointer"
                  onClick={(data) => {
                    const row = data as { project?: string; filled?: number; vacant?: number }
                    setDrillDown({
                      title: row.project ?? 'Project',
                      body: `Filled: ${row.filled} · Vacant: ${row.vacant} · Filter: ${filterSummary}`,
                      actionLabel: 'Open PCP list',
                      actionPath: '/pcp/all',
                    })
                  }}
                />
                <Bar dataKey="vacant" fill={primaryFill} name="Vacant" cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WidgetShell>

        {/* Widget 3 */}
        <WidgetShell title="Budget vs Actual" hint="Grouped bars + variance · red = over budget">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filtered.budgetVsActual}>
                <XAxis dataKey="costCenter" fontSize={12} />
                <YAxis tickFormatter={(v) => formatCurrencyCompact(Number(v))} fontSize={12} />
                <Tooltip
                  formatter={(v, name) => [formatCurrency(Number(v)), name]}
                  labelFormatter={(cc) => {
                    const row = filtered.budgetVsActual.find((r) => r.costCenter === cc)
                    return row ? `${cc} · ${row.variancePct >= 0 ? '+' : ''}${row.variancePct}% variance` : cc
                  }}
                />
                <Bar dataKey="budget" fill={accentFill} name="Budget" cursor="pointer" />
                <Bar
                  dataKey="actual"
                  name="Actual"
                  cursor="pointer"
                  onClick={(data) => {
                    const row = data as { costCenter?: string; budget?: number; actual?: number; variancePct?: number; overBudget?: boolean }
                    setDrillDown({
                      title: `Cost Center ${row.costCenter}`,
                      body: `Budget ${formatCurrency(row.budget ?? 0)} · Actual ${formatCurrency(row.actual ?? 0)} · ${row.overBudget ? 'OVER budget' : 'Within budget'} (${row.variancePct}%). Click through to position-level PCP detail.`,
                      actionLabel: 'View PCPs for CC',
                      actionPath: '/pcp/all',
                    })
                  }}
                >
                  {filtered.budgetVsActual.map((entry) => (
                    <Cell key={entry.costCenter} fill={entry.overBudget ? '#ef4444' : primaryFill} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="actual" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Variance line" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </WidgetShell>

        {/* Widget 4 — Vacancy Ageing heat map */}
        <WidgetShell title="Vacancy Ageing" hint="Heat map · deep red = aged & critical (60+ days)">
          <div className="overflow-x-auto">
            {filtered.vacancyAgeing.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No vacancy ageing data for selected filters.</p>
            ) : (
              <>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 text-left font-semibold">Trade</th>
                      {AGE_BUCKETS.map((b) => (
                        <th key={b} className="px-1 py-2 text-center font-semibold">{AGE_LABELS[b]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.vacancyAgeing.map((row) => (
                      <tr key={row.trade} className="border-t border-border/60">
                        <td className="py-2 pr-2 font-medium">{row.trade}</td>
                        {AGE_BUCKETS.map((key) => (
                          <td key={key} className="p-0.5">
                            <button
                              type="button"
                              className={cn(
                                'flex h-10 w-full items-center justify-center rounded-md text-sm font-semibold transition-opacity hover:opacity-90',
                                heatColor(row[key], key),
                              )}
                              onClick={() => setDrillDown({
                                title: `${row.trade} · ${AGE_LABELS[key]}`,
                                body: `${row[key]} open ${row.trade} vacancies in the ${AGE_LABELS[key]} bucket. ${key === 'd60plus' ? 'Critical ageing — prioritise sourcing.' : 'Monitor fill progress.'}`,
                                actionLabel: 'View approval queue',
                                actionPath: '/pcp/approval',
                              })}
                            >
                              {row[key]}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-300" /> 0–15d</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-400" /> 16–30d</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-orange-500" /> 31–60d</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-700" /> 60+d critical</span>
                </div>
              </>
            )}
          </div>
        </WidgetShell>

        {/* Widget 5 */}
        <WidgetShell title="Time-to-Fill by Geography" hint="Column chart">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filtered.timeToFill}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="geography" fontSize={12} />
                <YAxis fontSize={12} unit="d" />
                <Tooltip formatter={(v) => [`${v} days`, 'Avg time-to-fill']} />
                <Bar
                  dataKey="days"
                  fill={accentFill}
                  name="Days"
                  cursor="pointer"
                  onClick={(data) => {
                    const row = data as { geography?: string; days?: number }
                    setDrillDown({
                      title: row.geography ?? 'Geography',
                      body: `Average time-to-fill: ${row.days} days in ${row.geography}.`,
                    })
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WidgetShell>

        {/* Widget 6 */}
        <WidgetShell title="Charging Distribution" hint="Donut · hover for AED & %">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filtered.chargingDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  cursor="pointer"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  onClick={(data) => {
                    const row = data as { name?: string; value?: number }
                    const pct = chargingTotal ? Math.round(((row.value ?? 0) / chargingTotal) * 100) : 0
                    setDrillDown({
                      title: row.name ?? 'Charge',
                      body: `${formatCurrency(row.value ?? 0)} (${pct}% of total charging under current filters).`,
                    })
                  }}
                >
                  {filtered.chargingDistribution?.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, _n, props) => {
                  const val = Number(v)
                  const pct = chargingTotal ? ((val / chargingTotal) * 100).toFixed(1) : '0'
                  return [`${formatCurrency(val)} (${pct}%)`, (props as { payload?: { name?: string } }).payload?.name]
                }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </WidgetShell>

        {/* Widget 7 — Deployment Timeline Gantt */}
        <WidgetShell title="Deployment Timeline" hint="Gantt-style bars · flagged demob dates">
          <div className="min-h-[16rem] overflow-x-auto">
            {ganttData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No deployment rows for selected filters.</p>
            ) : (
              <div className="min-w-[520px] space-y-2">
                {ganttData.map((row) => (
                  <button
                    key={row.label}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left text-xs hover:bg-muted/40"
                    onClick={() => setDrillDown({
                      title: row.label,
                      body: `Deployment ${row.startMonth} – ${row.endMonth}${row.demob ? ' · DEMOB date flagged' : ''}. BU: ${row.businessUnit ?? '—'} · Geo: ${row.geography ?? '—'}.`,
                      actionLabel: 'View project PCPs',
                      actionPath: '/pcp/all',
                    })}
                  >
                    <span className="flex w-24 shrink-0 items-center gap-1 truncate font-medium sm:w-36 lg:w-40">
                      {row.demob && <Flag className="h-3 w-3 shrink-0 text-primary" aria-label="Demob" />}
                      {row.label}
                    </span>
                    <div className="relative h-7 flex-1 rounded bg-muted/50">
                      <div
                        className={cn(
                          'absolute top-1 h-5 rounded',
                          row.demob ? 'bg-primary/85 ring-1 ring-primary' : 'bg-accent/85',
                        )}
                        style={{ left: `${(row.start / 12) * 100}%`, width: `${(row.span / 12) * 100}%` }}
                      />
                    </div>
                  </button>
                ))}
                <div className="flex justify-between pl-24 text-[10px] text-muted-foreground sm:pl-36 lg:pl-40">
                  {MONTHS.map((m) => <span key={m}>{m}</span>)}
                </div>
                <div className="flex flex-wrap gap-2 pl-24 text-[10px] text-muted-foreground sm:gap-4 sm:pl-36 lg:pl-40">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-6 rounded bg-accent/85" /> Active deployment</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-6 rounded bg-primary/85 ring-1 ring-primary" /> Demob flagged</span>
                </div>
              </div>
            )}
          </div>
        </WidgetShell>

        {/* Widget 8 */}
        <WidgetShell title="Hiring Source Mix" hint="Stacked bar · count + cost per channel">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filtered.hiringSourceMix}>
                <XAxis dataKey="source" fontSize={12} />
                <YAxis yAxisId="left" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatCurrencyCompact(Number(v))} fontSize={12} />
                <Tooltip
                  formatter={(v, name) =>
                    name === 'Cost (AED)' ? formatCurrency(Number(v)) : v
                  }
                />
                <Legend />
                <Bar yAxisId="left" dataKey="count" stackId="mix" fill={accentFill} name="Hires" cursor="pointer" />
                <Bar
                  yAxisId="right"
                  dataKey="cost"
                  stackId="mix"
                  fill={primaryFill}
                  name="Cost (AED)"
                  cursor="pointer"
                  onClick={(data) => {
                    const row = data as { source?: string; count?: number; cost?: number }
                    setDrillDown({
                      title: row.source ?? 'Source',
                      body: `${row.count} hires via ${row.source} · total cost ${formatCurrency(row.cost ?? 0)}.`,
                    })
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </WidgetShell>

        {/* Widget 9 */}
        <WidgetShell title="Nationality Breakdown" hint="Donut · top 8 + Other">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filtered.nationalityBreakdown}
                  dataKey="value"
                  nameKey="nationality"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  cursor="pointer"
                  onClick={(data) => {
                    const row = data as { nationality?: string; value?: number }
                    setDrillDown({
                      title: row.nationality ?? 'Nationality',
                      body: `${row.value?.toLocaleString()} personnel (${row.nationality}).`,
                    })
                  }}
                >
                  {filtered.nationalityBreakdown?.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </WidgetShell>
      </div>

      {/* Widget 10 — Approval TAT (KPI + trend in one card) */}
      <WidgetShell title="Approval TAT" hint="KPI + trend line vs last quarter">
        <div
          className="mb-4 flex flex-wrap items-baseline gap-4 cursor-pointer rounded-lg p-2 hover:bg-muted/30"
          role="button"
          tabIndex={0}
          onClick={() => setDrillDown({
            title: 'Approval TAT Summary',
            body: `Average ${filtered.approvalTat?.avgDays} days · ${filtered.approvalTat?.trend} days vs last quarter under ${filterSummary}.`,
            actionLabel: 'Open approval queue',
            actionPath: '/pcp/approval',
          })}
          onKeyDown={(e) => e.key === 'Enter' && setDrillDown({
            title: 'Approval TAT Summary',
            body: `Average ${filtered.approvalTat?.avgDays} days · ${filtered.approvalTat?.trend} days vs last quarter.`,
            actionLabel: 'Open approval queue',
            actionPath: '/pcp/approval',
          })}
        >
          <div>
            <p className="text-sm text-muted-foreground">Avg approval TAT</p>
            <p className="text-3xl font-bold">{filtered.approvalTat?.avgDays} days</p>
          </div>
          <p className={cn(
            'text-sm font-medium',
            (filtered.approvalTat?.trend ?? 0) <= 0 ? 'text-emerald-600' : 'text-red-600',
          )}
          >
            {(filtered.approvalTat?.trend ?? 0) <= 0 ? '▼' : '▲'} {Math.abs(filtered.approvalTat?.trend ?? 0)} days vs last quarter
          </p>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filtered.approvalTatTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" fontSize={12} />
              <YAxis fontSize={12} domain={[0, 'auto']} unit="d" />
              <Tooltip formatter={(v) => [`${v} days`, 'Avg TAT']} />
              <Line type="monotone" dataKey="days" stroke={accentFill} strokeWidth={2} name="Avg days" dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </WidgetShell>

      {/* Widget 11 — Alert Feed */}
      <WidgetShell title="Alert Feed" hint="Actionable alerts">
        <div className="space-y-2">
          {filtered.alerts?.length ? filtered.alerts.map((a) => (
            <button
              key={a}
              type="button"
              className="flex w-full items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10"
              onClick={() => setDrillDown({
                title: 'Alert',
                body: a,
                actionLabel: a.includes('budget') ? 'View budgets' : 'View PCPs',
                actionPath: a.includes('budget') ? '/budgets' : '/pcp/all',
              })}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {a}
            </button>
          )) : (
            <p className="text-sm text-muted-foreground">No alerts for current filters.</p>
          )}
        </div>
      </WidgetShell>

      <Dialog
        open={Boolean(drillDown)}
        onClose={() => setDrillDown(null)}
        title={drillDown?.title ?? ''}
        description="Drill-down detail"
        footer={drillDown?.actionPath ? (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDrillDown(null)}>Close</Button>
            <Button onClick={() => { navigate(drillDown.actionPath!); setDrillDown(null) }}>
              {drillDown.actionLabel ?? 'Go'}
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setDrillDown(null)}>Close</Button>
          </div>
        )}
      >
        <p className="text-sm leading-relaxed">{drillDown?.body}</p>
      </Dialog>
    </div>
  )
}
