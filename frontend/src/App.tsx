import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthGate } from '@/components/layout/AuthGate'
import { ThemeSync } from '@/components/layout/ThemeSync'
import { FallbackRoute } from '@/components/layout/FallbackRoute'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { RoleGuard } from '@/components/layout/RoleGuard'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Projects } from '@/pages/Projects'
import { ProjectDetail } from '@/pages/ProjectDetail'
import { Tasks } from '@/pages/Tasks'
import { Resources } from '@/pages/Resources'
import { HR } from '@/pages/HR'
import { EmployeeProfile } from '@/pages/EmployeeProfile'
import { Timesheets } from '@/pages/Timesheets'
import { AttendancePage } from '@/pages/Attendance'
import { Budgets } from '@/pages/Budgets'
import { Reports } from '@/pages/Reports'
import { Settings } from '@/pages/Settings'
import { PcpDashboard } from '@/pages/pcp/PcpDashboard'
import { PcpNewRequest } from '@/pages/pcp/PcpNewRequest'
import { PcpList } from '@/pages/pcp/PcpList'
import { PcpDetail } from '@/pages/pcp/PcpDetail'
import { PcpApprovalQueue } from '@/pages/pcp/PcpApprovalQueue'
import { PcpRevisions } from '@/pages/pcp/PcpRevisions'
import { PcpExecutiveDashboard } from '@/pages/pcp/PcpExecutiveDashboard'
import { PcpAiInsights } from '@/pages/pcp/PcpAiInsights'
import { PcpAdmin } from '@/pages/pcp/PcpAdmin'
import { PcpAssistant } from '@/pages/pcp/PcpAssistant'

export default function App() {
  return (
    <AuthGate>
      <ThemeSync />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route element={<RoleGuard />}>
              <Route index element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetail />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="resources" element={<Resources />} />
              <Route path="hr" element={<HR />} />
              <Route path="hr/:id" element={<EmployeeProfile />} />
              <Route path="timesheets" element={<Timesheets />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="budgets" element={<Budgets />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="pcp/dashboard" element={<PcpDashboard />} />
              <Route path="pcp/new" element={<PcpNewRequest />} />
              <Route path="pcp/requests" element={<PcpList mode="mine" />} />
              <Route path="pcp/requests/:id" element={<PcpDetail />} />
              <Route path="pcp/all" element={<PcpList mode="all" />} />
              <Route path="pcp/approval" element={<PcpApprovalQueue />} />
              <Route path="pcp/revisions" element={<PcpRevisions />} />
              <Route path="pcp/executive" element={<PcpExecutiveDashboard />} />
              <Route path="pcp/insights" element={<PcpAiInsights />} />
              <Route path="pcp/assistant" element={<PcpAssistant />} />
              <Route path="admin" element={<PcpAdmin />} />
            </Route>
          </Route>
          </Route>
          <Route path="*" element={<FallbackRoute />} />
        </Routes>
      </BrowserRouter>
    </AuthGate>
  )
}
