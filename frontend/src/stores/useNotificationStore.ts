import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Notification } from '@/types'

interface NotificationState {
  notifications: Notification[]
  loading: boolean
  fetchNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,
  fetchNotifications: async () => {
    set({ loading: true })
    try {
      const notifications = await api.get<Notification[]>('/notifications')
      set({ notifications, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  markAsRead: async (id) => {
    await api.patch(`/notifications/${id}/read`)
    set({
      notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })
  },
  markAllAsRead: async () => {
    await api.patch('/notifications/read-all')
    set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) })
  },
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}))
