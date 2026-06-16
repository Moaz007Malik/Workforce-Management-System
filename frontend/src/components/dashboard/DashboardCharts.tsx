import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardMetrics } from '@/types'
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import { useThemeColors } from '@/lib/useThemeColors'
import { useBreakpoint } from '@/lib/useBreakpoint'

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1']
const STATUS_COLORS: Record<string, string> = {
  Active: '#10b981', Completed: '#3b82f6', Planned: '#8b5cf6',
  'On Hold': '#f59e0b', Draft: '#6b7280', Cancelled: '#ef4444',
}

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
}

interface DashboardChartsProps {
  metrics: DashboardMetrics
}

export function DashboardCharts({ metrics }: DashboardChartsProps) {
  const { accentFill, primaryFill } = useThemeColors()
  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'

  return (
    <>
      <Card className="min-w-0 animate-fade-in">
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">Project Status Distribution</CardTitle></CardHeader>
        <CardContent className="min-w-0">
          <div className="h-[220px] w-full min-w-0 sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={metrics.projectStatusDistribution.filter((d) => d.count > 0)}
                cx="50%" cy="50%" innerRadius={isMobile ? 45 : 60} outerRadius={isMobile ? 72 : 100}
                paddingAngle={4} dataKey="count" nameKey="status"
                label={isMobile ? false : (props) => `${props.name}: ${props.value}`}
              >
                {metrics.projectStatusDistribution.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || COLORS[0]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
              {isMobile && <Legend wrapperStyle={{ fontSize: 11 }} />}
            </PieChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">Budget vs Actual Cost</CardTitle></CardHeader>
        <CardContent className="min-w-0">
          <div className="h-[220px] w-full min-w-0 sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.budgetVsActual}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCurrencyCompact(Number(v))} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [formatCurrency(Number(v)), '']} />
              <Legend />
              <Bar dataKey="budget" fill={accentFill} radius={[4, 4, 0, 0]} name="Budget" />
              <Bar dataKey="actual" fill={primaryFill} radius={[4, 4, 0, 0]} name="Actual" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">Resource Utilization</CardTitle></CardHeader>
        <CardContent className="min-w-0">
          <div className="h-[220px] w-full min-w-0 sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.resourceUtilization} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={isMobile ? 56 : 80} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="utilization" radius={[0, 4, 4, 0]} name="Utilization %">
                {metrics.resourceUtilization.map((entry) => (
                  <Cell key={entry.id} fill={entry.utilization > 100 ? '#ef4444' : entry.utilization > 90 ? '#f59e0b' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">Monthly Spending Trend</CardTitle></CardHeader>
        <CardContent className="min-w-0">
          <div className="h-[220px] w-full min-w-0 sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.monthlySpending}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCurrencyCompact(Number(v))} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Cost']} />
              <Area type="monotone" dataKey="cost" stroke={accentFill} fill={accentFill} fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 animate-fade-in lg:col-span-2" style={{ animationDelay: '0.4s' }}>
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">Profitability Analysis</CardTitle></CardHeader>
        <CardContent className="min-w-0">
          <div className="h-[220px] w-full min-w-0 sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.projectProfitability}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="projectName" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCurrencyCompact(Number(v))} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [formatCurrency(Number(v)), '']} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="actualCost" fill={primaryFill} radius={[4, 4, 0, 0]} name="Cost" />
              <Bar dataKey="profit" fill={accentFill} radius={[4, 4, 0, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 animate-fade-in lg:col-span-2" style={{ animationDelay: '0.5s' }}>
        <CardHeader className="pb-2"><CardTitle className="text-base sm:text-lg">Employee Allocation (Hours)</CardTitle></CardHeader>
        <CardContent className="min-w-0">
          <div className="h-[220px] w-full min-w-0 sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.employeeAllocation}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend />
              <Bar dataKey="allocated" stackId="a" fill={accentFill} name="Allocated" radius={[0, 0, 0, 0]} />
              <Bar dataKey="available" stackId="a" fill="hsl(var(--muted))" name="Available" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
