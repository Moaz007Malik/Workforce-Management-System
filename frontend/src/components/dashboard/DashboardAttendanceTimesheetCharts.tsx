import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { DashboardMetrics } from '@/types'
import { useBreakpoint } from '@/lib/useBreakpoint'
import { useThemeColors } from '@/lib/useThemeColors'

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#94a3b8']
const ATTENDANCE_COLORS: Record<string, string> = {
  Present: '#10b981',
  Absent: '#ef4444',
  Late: '#f59e0b',
  'Half Day': '#8b5cf6',
  'On Leave': '#94a3b8',
}
const TIMESHEET_COLORS: Record<string, string> = {
  Approved: '#10b981',
  Pending: '#f59e0b',
  Rejected: '#ef4444',
}

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
}

interface DashboardAttendanceTimesheetChartsProps {
  metrics: DashboardMetrics
}

export function DashboardAttendanceTimesheetCharts({ metrics }: DashboardAttendanceTimesheetChartsProps) {
  const bp = useBreakpoint()
  const isMobile = bp === 'mobile'
  const { primaryFill } = useThemeColors()

  const attendanceData = (metrics.attendanceStatusDistribution ?? []).filter((d) => d.count > 0)
  const timesheetStatus = (metrics.timesheetStatusDistribution ?? []).filter((d) => d.count > 0)
  const dailyTrend = metrics.attendanceDailyTrend ?? []
  const monthlyHours = metrics.monthlyHoursLogged ?? []
  const hoursByProject = metrics.timesheetHoursByProject ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Attendance & Timesheets</h2>
        <div className="flex gap-2">
          <Link to="/attendance"><Button variant="outline" size="sm">Attendance</Button></Link>
          <Link to="/timesheets"><Button variant="outline" size="sm">Timesheets</Button></Link>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Daily Attendance (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="h-[240px] w-full min-w-0 sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Bar dataKey="present" stackId="a" fill="#10b981" name="Present" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="onLeave" stackId="a" fill="#94a3b8" name="On Leave" />
                  <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Attendance Status (30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 45 : 55}
                    outerRadius={isMobile ? 72 : 90}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                    label={isMobile ? false : (props) => `${props.name}: ${props.value}`}
                  >
                    {attendanceData.map((entry) => (
                      <Cell key={entry.status} fill={ATTENDANCE_COLORS[entry.status] || COLORS[0]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  {isMobile && <Legend wrapperStyle={{ fontSize: 11 }} />}
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Timesheet Status</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timesheetStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={isMobile ? 45 : 55}
                    outerRadius={isMobile ? 72 : 90}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                    label={isMobile ? false : (props) => `${props.name}: ${props.value}`}
                  >
                    {timesheetStatus.map((entry) => (
                      <Cell key={entry.status} fill={TIMESHEET_COLORS[entry.status] || COLORS[0]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  {isMobile && <Legend wrapperStyle={{ fontSize: 11 }} />}
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Hours Logged per Month</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="h-[240px] w-full min-w-0 sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="approvedHours" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.5} name="Approved hours" />
                  <Area type="monotone" dataKey="pendingHours" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} name="Pending hours" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Approved Hours by Project</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="h-[240px] w-full min-w-0 sm:h-[280px]">
              {hoursByProject.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No approved timesheet hours yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hoursByProject} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={isMobile ? 80 : 120} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="hours" name="Hours" fill={primaryFill} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
