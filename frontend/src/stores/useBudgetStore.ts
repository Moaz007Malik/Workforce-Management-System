import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Budget } from '@/types'

interface BudgetState {
  budgets: Budget[]
  loading: boolean
  fetchBudgets: () => Promise<void>
  getBudgetByProject: (projectId: string) => Budget | undefined
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  loading: false,
  fetchBudgets: async () => {
    set({ loading: true })
    try {
      const budgets = await api.get<Budget[]>('/budgets')
      set({ budgets, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  getBudgetByProject: (projectId) => get().budgets.find((b) => b.projectId === projectId),
}))
