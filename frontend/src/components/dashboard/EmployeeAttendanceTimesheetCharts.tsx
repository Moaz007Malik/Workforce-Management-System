import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Attendance, Timesheet } from '@/types'
import { useBreakpoint } from '@/lib/useBreakpoint'

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

interface EmployeeAttendanceTimesheetChartsProps {
  attendance: Attendance[]
  timesheets: Timesheet[]
  projectMap: Record<string, string>
}

export function EmployeeAttendanceTimesheetCharts({
  attendance,
  timesheets,
  projectMap,
}: EmployeeAttendanceTimesheetChartsProps) {
  const isMobile = useBreakpoint() === 'mobile'

  const attendanceStatus = useMemo(() => {
    const statuses = ['Present', 'Absent', 'Late', 'Half Day', 'On Leave']
    return statuses
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
        return {
          month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
          approvedHours: Math.round(val.approved * 10) / 10,
          pendingHours: Math.round(val.pending * 10) / 10,
        }
      })
  }, [timesheets])

  const hoursByProject = useMemo(() => {
    const map = new Map<string, number>()
    timesheets
      .filter((t) => t.status === 'Approved')
      .forEach((t) => map.set(t.projectId, (map.get(t.projectId) || 0) + (t.hoursWorked || 0)))
    return [...map.entries()]
      .map(([projectId, hours]) => ({
        name: projectMap[projectId] || 'Project',
        hours: Math.round(hours * 10) / 10,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)
  }, [timesheets, projectMap])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">My Attendance & Timesheets</h2>
        <div className="flex gap-2">
          <Link to="/attendance"><Button variant="outline" size="sm">Attendance</Button></Link>
          <Link to="/timesheets"><Button variant="outline" size="sm">Timesheets</Button></Link>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {recentAttendance.length > 0 && (
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">Recent Attendance Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recentAttendance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="hours" name="Work hours" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {attendanceStatus.length > 0 && (
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">My Attendance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={attendanceStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="status">
                      {attendanceStatus.map((entry) => (
                        <Cell key={entry.status} fill={ATTENDANCE_COLORS[entry.status] || '#8b5cf6'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                    {!isMobile && <Legend />}
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {timesheetStatus.length > 0 && (
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">My Timesheet Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={timesheetStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="status">
                      {timesheetStatus.map((entry) => (
                        <Cell key={entry.status} fill={TIMESHEET_COLORS[entry.status] || '#8b5cf6'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                    {!isMobile && <Legend />}
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {monthlyHours.length > 0 && (
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">My Hours Logged</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend />
                    <Area type="monotone" dataKey="approvedHours" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.5} name="Approved" />
                    <Area type="monotone" dataKey="pendingHours" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} name="Pending" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {hoursByProject.length > 0 && (
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">My Hours by Project</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hoursByProject} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="hours" name="Hours" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
