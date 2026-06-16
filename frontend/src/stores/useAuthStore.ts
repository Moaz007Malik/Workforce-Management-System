import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Employee } from '@/types'
import { api } from '@/lib/api'
import { clearAuthToken, setAuthToken } from '@/lib/auth'
import { useAppStore } from '@/stores/useAppStore'

interface AuthState {
  token: string | null
  user: Employee | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  restoreSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      ready: false,

      login: async (email, password) => {
        const res = await api.post<{ token: string; user: Employee }>(
          '/auth/login',
          { email, password },
          { skipAuth: true },
        )
        setAuthToken(res.token)
        set({ token: res.token, user: res.user })
        useAppStore.getState().setCurrentUser(res.user)
      },

      logout: () => {
        clearAuthToken()
        set({ token: null, user: null, ready: true })
        useAppStore.getState().syncFromEmployee(undefined)
        useAppStore.setState({ currentUserId: '' })
      },

      restoreSession: async () => {
        if (get().ready) return

        const token = get().token
        if (!token) {
          set({ ready: true })
          return
        }

        setAuthToken(token)
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 8000)
          const res = await api.get<{ user: Employee }>('/auth/me', { signal: controller.signal })
          clearTimeout(timeout)
          set({ user: res.user })
          useAppStore.getState().setCurrentUser(res.user)
        } catch {
          clearAuthToken()
          set({ token: null, user: null })
        } finally {
          set({ ready: true })
        }
      },
    }),
    {
      name: 'descon-auth-session',
      partialize: (s) => ({ token: s.token }),
    },
  ),
)

/** Clear invalid session without a full page reload (used by API 401 handler). */
export function clearAuthSession() {
  clearAuthToken()
  useAuthStore.setState({ token: null, user: null, ready: true })
}
