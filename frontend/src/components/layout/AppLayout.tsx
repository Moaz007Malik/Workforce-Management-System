import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useLayoutEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { useAppStore } from '@/stores/useAppStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { useEmployeeStore } from '@/stores/useEmployeeStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { cn } from '@/lib/utils'
import { ChatBot } from '@/components/chatbot/ChatBot'
import { Footer } from '@/components/layout/Footer'
import { StatusLegend } from '@/components/pcp/StatusLegend'
import { isDrawerViewport, DRAWER_MAX_WIDTH } from '@/lib/useBreakpoint'

export function AppLayout() {
  const { darkMode, sidebarOpen, setSidebarOpen, syncFromEmployee } = useAppStore()
  const { user } = useAuthStore()
  const { fetchNotifications } = useNotificationStore()
  const { fetchEmployees } = useEmployeeStore()
  const location = useLocation()

  useEffect(() => {
    fetchNotifications()
    fetchEmployees()
  }, [fetchNotifications, fetchEmployees])

  useEffect(() => {
    if (user) syncFromEmployee(user)
  }, [user, syncFromEmployee])

  useLayoutEffect(() => {
    if (isDrawerViewport()) setSidebarOpen(false)
  }, [setSidebarOpen])

  useEffect(() => {
    if (isDrawerViewport()) setSidebarOpen(false)
  }, [location.pathname, location.search, setSidebarOpen])

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${DRAWER_MAX_WIDTH}px)`)
    const onChange = () => {
      if (mq.matches) setSidebarOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [setSidebarOpen])

  return (
    <div className={cn('min-h-screen min-h-dvh gradient-bg', darkMode && 'dark')}>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />

      <div
        className={cn(
          'flex min-h-screen min-h-dvh flex-col transition-[margin] duration-300',
          'ml-0',
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-[72px]',
        )}
      >
        <TopNav />
        <main className="flex-1 overflow-x-hidden p-3 sm:p-4 md:p-6">
          <StatusLegend compact className="mb-3 sm:mb-4" />
          <Outlet />
        </main>
        <Footer />
      </div>
      <ChatBot />
    </div>
  )
}
