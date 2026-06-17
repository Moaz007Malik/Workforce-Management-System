import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Area, LabelList, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Attendance, Timesheet } from '@/types'
import { useBreakpoint } from '@/lib/useBreakpoint'
import { cn } from '@/lib/utils'
import {
  ATTENDANCE_COLORS, TIMESHEET_COLORS, CHART_PALETTE, ChartGradientDefs,
  ChartTooltipContent, DistributionLegend, DonutChart, MiniStat, ChartEmpty, pct,
  chartAxisProps,
} from '@/components/dashboard/chartPrimitives'

interface EmployeeAttendanceTimesheetChartsProps {
  attendance: Attendance[]
  timesheets: Timesheet[]
  projectMap: Record<string, string>
}

const STATUS_HOURS_COLOR: Record<string, string> = {
  Present: '#10b981',
  Absent: '#ef4444',
  Late: '#f59e0b',
  'Half Day': '#8b5cf6',
  'On Leave': '#94a3b8',
}

export function EmployeeAttendanceTimesheetCharts({
  attendance,
  timesheets,
  projectMap,
}: EmployeeAttendanceTimesheetChartsProps) {
  const isMobile = useBreakpoint() === 'mobile'

  const attendanceStatus = useMemo(() => {
    return ['Present', 'Absent', 'Late', 'Half Day', 'On Leave']
      .map((status) => ({ status, count: attendance.filter((a) => a.status === status).length }))
      .filter((d) => d.count > 0)
  }, [attendance])

  const timesheetStatus = useMemo(() => {
    return ['Pending', 'Approved', 'Rejected']
      .map((status) => ({ status, count: timesheets.filter((t) => t.status === status).length }))
      .filter((d) => d.count > 0)
  }, [timesheets])

  const recentAttendance = useMemo(() => {
    const sorted = [...attendance].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14).reverse()
    return sorted.map((a) => ({
      date: a.date.slice(5),
      hours: a.workHours ?? 0,
      status: a.status,
      fill: STATUS_HOURS_COLOR[a.status] || '#8b5cf6',
    }))
  }, [attendance])

  const monthlyHours = useMemo(() => {
    const map = new Map<string, { approved: number; pending: number }>()
    timesheets.forEach((ts) => {
      const month = ts.date.slice(0, 7)
      const cur = map.get(month) ?? { approved: 0, pending: 0 }
      if (ts.status === 'Approved') cur.approved += ts.hoursWorked || 0
      else if (ts.status === 'Pending') cur.pending += ts.hoursWorked || 0
      map.set(month, cur)
    })
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, val]) => {
        const d = new Date(`${key}-01`)
        const approvedHours = Math.round(val.approved * 10) / 10
        const pendingHours = Math.round(val.pending * 10) / 10
        return {
          month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
          approvedHours,
          pendingHours,
          totalHours: Math.round((val.approved + val.pending) * 10) / 10,
        }
      })
  }, [timesheets])

  const hoursByProject = useMemo(() => {
    const map = new Map<string, number>()
    timesheets
      .filter((t) => t.status === 'Approved')
      .forEach((t) => map.set(t.projectId, (map.get(t.projectId) || 0) + (t.hoursWorked || 0)))
    return [...map.entries()]
      .map(([projectId, hours], i) => ({
        name: projectMap[projectId] || 'Project',
        hours: Math.round(hours * 10) / 10,
        color: CHART_PALETTE[i % CHART_PALETTE.length],
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 6)
  }, [timesheets, projectMap])

  const stats = useMemo(() => {
    const attTotal = attendanceStatus.reduce((s, d) => s + d.count, 0)
    const presentCount = attendanceStatus.find((d) => d.status === 'Present')?.count ?? 0
    const tsTotal = timesheetStatus.reduce((s, d) => s + d.count, 0)
    const approvedCount = timesheetStatus.find((d) => d.status === 'Approved')?.count ?? 0
    const totalHours = timesheets.reduce((s, t) => s + (t.hoursWorked || 0), 0)
    const avgDailyHours = recentAttendance.length
      ? Math.round((recentAttendance.reduce((s, d) => s + d.hours, 0) / recentAttendance.length) * 10) / 10
      : 0
    return {
      presentPct: pct(presentCount, attTotal),
      approvalRate: pct(approvedCount, tsTotal),
      totalHours: Math.round(totalHours * 10) / 10,
      avgDailyHours,
      attTotal,
      tsTotal,
    }
  }, [attendanceStatus, timesheetStatus, timesheets, recentAttendance])

  const hasData = attendance.length > 0 || timesheets.length > 0
  if (!hasData) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">My Attendance & Timesheets</h2>
          <p className="text-sm text-muted-foreground">Your presence and time tracking at a glance</p>
        </div>
        <div className="flex gap-2">
          <Link to="/attendance"><Button variant="outline" size="sm">Attendance</Button></Link>
          <Link to="/timesheets"><Button variant="outline" size="sm">Timesheets</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <MiniStat label="Present rate" value={`${stats.presentPct}%`} sub={`${stats.attTotal} days tracked`} accent="#10b981" />
        <MiniStat label="Approval rate" value={`${stats.approvalRate}%`} sub={`${stats.tsTotal} entries`} accent="#6366f1" />
        <MiniStat label="Total hours" value={stats.totalHours} sub="All timesheets" />
        <MiniStat label="Avg daily hours" value={stats.avgDailyHours} sub="Last 14 days" accent="#8b5cf6" />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {recentAttendance.length > 0 && (
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">Daily Work Hours</CardTitle>
              <CardDescription>Color-coded by attendance status (last 14 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] w-full min-w-0 sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recentAttendance} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <ChartGradientDefs />
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" {...chartAxisProps} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis {...chartAxisProps} />
                    <Tooltip
                      content={({ active, payload }) => (
                        <ChartTooltipContent
                          active={active}
                          payload={payload as unknown as { name?: string; value?: number; color?: string }[]}
                          label={payload?.[0]?.payload?.status ? `${payload[0].payload.date} · ${payload[0].payload.status}` : undefined}
                          formatter={(v) => [`${v}h`, 'Work hours']}
                        />
                      )}
                    />
                    <Bar dataKey="hours" name="Work hours" radius={[6, 6, 0, 0]} barSize={isMobile ? 18 : 24}>
                      {recentAttendance.map((entry) => (
                        <Cell key={`${entry.date}-${entry.status}`} fill={entry.fill} />
                      ))}
                      <LabelList dataKey="hours" position="top" className="fill-muted-foreground text-[10px]" formatter={(v) => (Number(v) > 0 ? `${v}h` : '')} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {attendanceStatus.length > 0 && (
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">Attendance Breakdown</CardTitle>
              <CardDescription>Your status distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
                <DonutChart
                  data={attendanceStatus}
                  colors={ATTENDANCE_COLORS}
                  centerValue={`${stats.presentPct}%`}
                  centerLabel="Present"
                  height={isMobile ? 180 : 200}
                />
                <DistributionLegend data={attendanceStatus} colors={ATTENDANCE_COLORS} className="justify-center" />
              </div>
            </CardContent>
          </Card>
        )}

        {timesheetStatus.length > 0 && (
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">Timesheet Status</CardTitle>
              <CardDescription>Submission outcomes</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

        {monthlyHours.length > 0 && (
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">Monthly Hours</CardTitle>
              <CardDescription>Approved vs pending with total trend</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] w-full min-w-0 sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyHours} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <ChartGradientDefs />
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" {...chartAxisProps} />
                    <YAxis {...chartAxisProps} />
                    <Tooltip content={<ChartTooltipContent formatter={(v, n) => [`${v}h`, n]} />} />
                    <Bar dataKey="approvedHours" fill="url(#gradApproved)" name="Approved" radius={[4, 4, 0, 0]} barSize={28} />
                    <Bar dataKey="pendingHours" fill="url(#gradPending)" name="Pending" radius={[4, 4, 0, 0]} barSize={28} />
                    <Area type="monotone" dataKey="totalHours" fill="url(#gradHours)" stroke="#7c3aed" strokeWidth={2} name="Total" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {hoursByProject.length > 0 && (
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">Hours by Project</CardTitle>
              <CardDescription>Approved time allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hoursByProject} layout="vertical" margin={{ top: 4, right: 48, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" {...chartAxisProps} />
                    <YAxis type="category" dataKey="name" width={isMobile ? 88 : 120} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltipContent formatter={(v) => [`${v}h`, 'Hours']} />} />
                    <Bar dataKey="hours" name="Hours" radius={[0, 6, 6, 0]} barSize={22}>
                      {hoursByProject.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                      <LabelList dataKey="hours" position="right" className="fill-foreground text-xs font-medium" formatter={(v) => `${v ?? 0}h`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {recentAttendance.length === 0 && attendanceStatus.length === 0 && timesheetStatus.length === 0 && (
          <Card className="min-w-0 lg:col-span-2">
            <CardContent className="pt-6">
              <ChartEmpty message="Start logging attendance and timesheets to see your charts." />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
