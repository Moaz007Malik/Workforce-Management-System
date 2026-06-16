import { create } from 'zustand'
import { api } from '@/lib/api'
import type { DashboardMetrics } from '@/types'

interface DashboardState {
  metrics: DashboardMetrics | null
  loading: boolean
  fetchMetrics: () => Promise<void>
}

export const useDashboardStore = create<DashboardState>((set) => ({
  metrics: null,
  loading: false,
  fetchMetrics: async () => {
    set({ loading: true })
    try {
      const metrics = await api.get<DashboardMetrics>('/dashboard')
      set({ metrics, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
