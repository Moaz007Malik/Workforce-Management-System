import { create } from 'zustand'

interface ChatBotState {
  open: boolean
  pendingQuery: string | null
  openChat: (query?: string) => void
  closeChat: () => void
  clearPendingQuery: () => void
}

export const useChatBotStore = create<ChatBotState>((set) => ({
  open: false,
  pendingQuery: null,
  openChat: (query) =>
    set({
      open: true,
      pendingQuery: query?.trim() ? query.trim() : null,
    }),
  closeChat: () => set({ open: false }),
  clearPendingQuery: () => set({ pendingQuery: null }),
}))
