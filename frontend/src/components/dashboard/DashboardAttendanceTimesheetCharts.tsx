import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Area, LabelList, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { DashboardMetrics } from '@/types'
import { useBreakpoint } from '@/lib/useBreakpoint'
import { useThemeColors } from '@/lib/useThemeColors'
import { cn } from '@/lib/utils'
import {
  ATTENDANCE_COLORS, TIMESHEET_COLORS, ChartGradientDefs, ChartTooltipContent,
  DistributionLegend, DonutChart, MiniStat, ChartEmpty, pct, chartAxisProps,
} from '@/components/dashboard/chartPrimitives'

interface DashboardAttendanceTimesheetChartsProps {
  metrics: DashboardMetrics
}

export function DashboardAttendanceTimesheetCharts({ metrics }: DashboardAttendanceTimesheetChartsProps) {
  const isMobile = useBreakpoint() === 'mobile'
  const { primaryFill } = useThemeColors()

  const attendanceData = (metrics.attendanceStatusDistribution ?? []).filter((d) => d.count > 0)
  const timesheetStatus = (metrics.timesheetStatusDistribution ?? []).filter((d) => d.count > 0)
  const dailyTrend = metrics.attendanceDailyTrend ?? []
  const monthlyHours = metrics.monthlyHoursLogged ?? []
  const hoursByProject = metrics.timesheetHoursByProject ?? []

  const dailyWithRate = useMemo(
    () => dailyTrend.map((d) => ({
      ...d,
      attendanceRate: d.expected > 0 ? Math.round((d.present / d.expected) * 100) : 0,
    })),
    [dailyTrend],
  )

  const stats = useMemo(() => {
    const attTotal = attendanceData.reduce((s, d) => s + d.count, 0)
    const presentCount = attendanceData.find((d) => d.status === 'Present')?.count ?? 0
    const tsTotal = timesheetStatus.reduce((s, d) => s + d.count, 0)
    const approvedCount = timesheetStatus.find((d) => d.status === 'Approved')?.count ?? 0
    const avgRate = dailyWithRate.length
      ? Math.round(dailyWithRate.reduce((s, d) => s + d.attendanceRate, 0) / dailyWithRate.length)
      : 0
    const lastMonth = monthlyHours[monthlyHours.length - 1]
    const totalHoursMonth = lastMonth
      ? (lastMonth.totalHours ?? (lastMonth.approvedHours ?? 0) + (lastMonth.pendingHours ?? 0))
      : 0
    return {
      attTotal,
      presentPct: pct(presentCount, attTotal),
      tsTotal,
      approvalRate: pct(approvedCount, tsTotal),
      avgRate,
      totalHoursMonth,
    }
  }, [attendanceData, timesheetStatus, dailyWithRate, monthlyHours])

  const projectBarData = useMemo(
    () => hoursByProject.map((p, i) => ({
      ...p,
      color: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][i % 6],
    })),
    [hoursByProject],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Attendance & Timesheets</h2>
          <p className="text-sm text-muted-foreground">Workforce presence and time tracking insights</p>
        </div>
        <div className="flex gap-2">
          <Link to="/attendance"><Button variant="outline" size="sm">Attendance</Button></Link>
          <Link to="/timesheets"><Button variant="outline" size="sm">Timesheets</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <MiniStat label="Avg attendance rate" value={`${stats.avgRate}%`} sub="Last 14 days" accent="#10b981" />
        <MiniStat label="Present (30d)" value={`${stats.presentPct}%`} sub={`${stats.attTotal} records`} />
        <MiniStat label="Timesheet approval" value={`${stats.approvalRate}%`} sub={`${stats.tsTotal} entries`} accent="#6366f1" />
        <MiniStat label="Hours this month" value={stats.totalHoursMonth} sub="All statuses" accent={primaryFill} />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Daily Attendance Trend</CardTitle>
            <CardDescription>Stacked headcount with attendance rate overlay (14 days)</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {dailyWithRate.length === 0 ? (
              <ChartEmpty message="No attendance data for the selected period." />
            ) : (
              <div className="h-[260px] w-full min-w-0 sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dailyWithRate} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <ChartGradientDefs />
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" {...chartAxisProps} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis yAxisId="left" allowDecimals={false} {...chartAxisProps} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" {...chartAxisProps} />
                    <Tooltip content={<ChartTooltipContent formatter={(v, n) => [
                      n === 'Attendance rate' ? `${v}%` : String(v),
                      n,
                    ]} />} />
                    <Bar yAxisId="left" dataKey="present" stackId="a" fill="url(#gradPresent)" name="Present" radius={[0, 0, 0, 0]} />
                    <Bar yAxisId="left" dataKey="onLeave" stackId="a" fill="url(#gradOnLeave)" name="On Leave" />
                    <Bar yAxisId="left" dataKey="absent" stackId="a" fill="url(#gradAbsent)" name="Absent" radius={[4, 4, 0, 0]} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="attendanceRate"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      name="Attendance rate"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Attendance Breakdown</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {attendanceData.length === 0 ? (
              <ChartEmpty message="No attendance records yet." />
            ) : (
              <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
                <DonutChart
                  data={attendanceData}
                  colors={ATTENDANCE_COLORS}
                  centerValue={`${stats.presentPct}%`}
                  centerLabel="Present"
                  height={isMobile ? 180 : 200}
                />
                <DistributionLegend data={attendanceData} colors={ATTENDANCE_COLORS} className="justify-center" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Timesheet Status</CardTitle>
            <CardDescription>All entries</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {timesheetStatus.length === 0 ? (
              <ChartEmpty message="No timesheet entries yet." />
            ) : (
              <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
                <DonutChart
                  data={timesheetStatus}
                  colors={TIMESHEET_COLORS}
                  centerValue={`${stats.approvalRate}%`}
                  centerLabel="Approved"
                  height={isMobile ? 180 : 200}
                />
                <DistributionLegend data={timesheetStatus} colors={TIMESHEET_COLORS} className="justify-center" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Hours Logged per Month</CardTitle>
            <CardDescription>Approved vs pending with total trend</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {monthlyHours.length === 0 ? (
              <ChartEmpty message="No timesheet hours logged yet." />
            ) : (
              <div className="h-[260px] w-full min-w-0 sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyHours} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <ChartGradientDefs />
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" {...chartAxisProps} />
                    <YAxis {...chartAxisProps} />
                    <Tooltip content={<ChartTooltipContent formatter={(v, n) => [`${v}h`, n]} />} />
                    <Bar dataKey="approvedHours" fill="url(#gradApproved)" name="Approved" radius={[4, 4, 0, 0]} barSize={28} />
                    <Bar dataKey="pendingHours" fill="url(#gradPending)" name="Pending" radius={[4, 4, 0, 0]} barSize={28} />
                    <Area
                      type="monotone"
                      dataKey="totalHours"
                      fill="url(#gradHours)"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      name="Total hours"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Approved Hours by Project</CardTitle>
            <CardDescription>Top projects by logged time</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {projectBarData.length === 0 ? (
              <ChartEmpty message="No approved timesheet hours yet." />
            ) : (
              <div className="h-[260px] w-full min-w-0 sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectBarData} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 4 }}>
                    <ChartGradientDefs />
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" {...chartAxisProps} />
                    <YAxis type="category" dataKey="name" width={isMobile ? 88 : 130} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltipContent formatter={(v) => [`${v}h`, 'Hours']} />} />
                    <Bar dataKey="hours" name="Hours" radius={[0, 6, 6, 0]} barSize={22}>
                      {projectBarData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                      <LabelList dataKey="hours" position="right" className="fill-foreground text-xs font-medium" formatter={(v) => `${v ?? 0}h`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
