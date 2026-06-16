import { create } from 'zustand'
import { api } from '@/lib/api'
import type { PcpMasters, PcpRequest, PcpRevision, PcpUser } from '@/types'

interface PcpState {
  masters: PcpMasters | null
  requests: PcpRequest[]
  queue: PcpRequest[]
  revisions: PcpRevision[]
  users: PcpUser[]
  executive: Record<string, unknown> | null
  insights: Record<string, unknown> | null
  loading: boolean
  fetchMasters: () => Promise<void>
  setMasters: (masters: PcpMasters) => void
  fetchRequests: (params?: Record<string, string>) => Promise<void>
  fetchRequest: (id: string) => Promise<PcpRequest>
  fetchQueue: (params?: Record<string, string>) => Promise<void>
  fetchRevisions: (pcpId?: string) => Promise<void>
  fetchUsers: () => Promise<void>
  fetchExecutive: () => Promise<void>
  fetchInsights: () => Promise<void>
  createRequest: (data: Partial<PcpRequest>) => Promise<PcpRequest>
  updateRequest: (id: string, data: Partial<PcpRequest>) => Promise<PcpRequest>
  submitRequest: (id: string) => Promise<PcpRequest>
  actionRequest: (id: string, action: string, comment?: string) => Promise<PcpRequest>
  createRevision: (pcpId: string, data: { summary: string; justification: string; changes: unknown[]; positions?: unknown[] }) => Promise<unknown>
  askAssistant: (message: string, role: string, businessUnit: string) => Promise<Record<string, unknown>>
}

export const usePcpStore = create<PcpState>((set) => ({
  masters: null,
  requests: [],
  queue: [],
  revisions: [],
  users: [],
  executive: null,
  insights: null,
  loading: false,

  fetchMasters: async () => {
    const masters = await api.get<PcpMasters>('/pcp/masters')
    set({ masters })
  },

  setMasters: (masters) => set({ masters }),

  fetchRequests: async (params = {}) => {
    set({ loading: true })
    const qs = new URLSearchParams(params).toString()
    const requests = await api.get<PcpRequest[]>(`/pcp/requests?${qs}`)
    set({ requests, loading: false })
  },

  fetchRequest: async (id) => api.get<PcpRequest>(`/pcp/requests/${id}`),

  fetchQueue: async (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    const queue = await api.get<PcpRequest[]>(`/pcp/approval-queue?${qs}`)
    set({ queue })
  },

  fetchRevisions: async (pcpId) => {
    const qs = pcpId ? `?pcpId=${pcpId}` : ''
    const revisions = await api.get<PcpRevision[]>(`/pcp/revisions${qs}`)
    set({ revisions })
  },

  fetchUsers: async () => {
    const users = await api.get<PcpUser[]>('/pcp/users')
    set({ users })
  },

  fetchExecutive: async () => {
    const executive = await api.get<Record<string, unknown>>('/pcp/executive/dashboard')
    set({ executive })
  },

  fetchInsights: async () => {
    const insights = await api.get<Record<string, unknown>>('/pcp/insights')
    set({ insights })
  },

  createRequest: async (data) => {
    const created = await api.post<PcpRequest>('/pcp/requests', data)
    return created
  },

  updateRequest: async (id, data) => api.put<PcpRequest>(`/pcp/requests/${id}`, data),

  submitRequest: async (id) => api.post<PcpRequest>(`/pcp/requests/${id}/submit`, {}),

  actionRequest: async (id, action, comment) =>
    api.post<PcpRequest>(`/pcp/requests/${id}/action`, { action, comment }),

  createRevision: async (pcpId, data) => {
    const rev = await api.post('/pcp/revisions', { pcpId, ...data })
    if (data.positions) {
      await api.put(`/pcp/requests/${pcpId}`, { positions: data.positions })
    }
    return rev
  },

  askAssistant: async (message, role, businessUnit) =>
    api.post<Record<string, unknown>>('/pcp/assistant', { message, role, businessUnit }),
}))
