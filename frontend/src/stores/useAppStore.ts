import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Employee, PcpRole, SystemRole } from '@/types'
import { syncPcpFromEmployee } from '@/lib/userContext'
import { DEFAULT_COLOR_THEME, type ColorThemeId } from '@/lib/themes'

interface NotificationPrefs {
  taskAssignments: boolean
  budgetAlerts: boolean
  resourceOverallocation: boolean
  leaveApprovals: boolean
  taskOverdue: boolean
}

interface AppState {
  darkMode: boolean
  colorTheme: ColorThemeId
  sidebarOpen: boolean
  currentUserId: string
  systemRole: SystemRole
  pcpRole: PcpRole | null
  businessUnit: string
  notificationPrefs: NotificationPrefs
  toggleDarkMode: () => void
  setDarkMode: (dark: boolean) => void
  setColorTheme: (theme: ColorThemeId) => void
  setSidebarOpen: (open: boolean) => void
  setCurrentUserId: (id: string) => void
  setCurrentUser: (employee: Employee) => void
  syncFromEmployee: (employee: Employee | undefined) => void
  toggleNotificationPref: (key: keyof NotificationPrefs) => void
}

const defaultPrefs: NotificationPrefs = {
  taskAssignments: true,
  budgetAlerts: true,
  resourceOverallocation: true,
  leaveApprovals: true,
  taskOverdue: true,
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      darkMode: false,
      colorTheme: DEFAULT_COLOR_THEME,
      sidebarOpen: true,
      currentUserId: 'emp-1',
      systemRole: 'Manager',
      pcpRole: 'Requester',
      businessUnit: 'Construction – North',
      notificationPrefs: defaultPrefs,
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setDarkMode: (dark) => set({ darkMode: dark }),
      setColorTheme: (theme) => set({ colorTheme: theme }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setCurrentUserId: (id) => set({ currentUserId: id }),
      setCurrentUser: (employee) => {
        const { systemRole, pcpRole, businessUnit } = syncPcpFromEmployee(employee)
        set({ currentUserId: employee.id, systemRole, pcpRole, businessUnit })
      },
      syncFromEmployee: (employee) => {
        const { systemRole, pcpRole, businessUnit } = syncPcpFromEmployee(employee)
        set({ systemRole, pcpRole, businessUnit })
      },
      toggleNotificationPref: (key) =>
        set((s) => ({ notificationPrefs: { ...s.notificationPrefs, [key]: !s.notificationPrefs[key] } })),
    }),
    { name: 'app-settings', partialize: (s) => ({
      darkMode: s.darkMode,
      colorTheme: s.colorTheme,
      sidebarOpen: s.sidebarOpen,
      notificationPrefs: s.notificationPrefs,
    }) },
  )
)
