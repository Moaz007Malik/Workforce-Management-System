import { create } from 'zustand'
import { processAssistantMessage, type AssistantLink } from '@/lib/assistantEngine'
import type { ChatContext } from '@/lib/chatbotEngine'

export interface AssistantMessage {
  id: string
  role: 'user' | 'bot'
  text: string
  table?: Record<string, unknown>[]
  source?: string
  actions?: string[]
  links?: AssistantLink[]
}

interface AssistantState {
  messages: AssistantMessage[]
  context: ChatContext
  loading: boolean
  initialized: boolean
  initWelcome: (_pathname: string, welcome: string) => void
  send: (
    text: string,
    pathname: string,
    pcpRole: string,
    businessUnit: string,
    userId?: string,
    systemRole?: string,
  ) => Promise<void>
  clear: (welcome: string) => void
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  messages: [],
  context: { lastMatchedProjectIds: [], lastQueryDescription: '' },
  loading: false,
  initialized: false,

  initWelcome: (_pathname, welcome) => {
    if (get().initialized) return
    set({
      initialized: true,
      messages: [{ id: 'welcome', role: 'bot', text: welcome }],
    })
  },

      send: async (text, pathname, pcpRole, businessUnit, userId, systemRole) => {
        const trimmed = text.trim()
        if (!trimmed || get().loading) return

        const priorMessages = get().messages

        set((s) => ({
          loading: true,
          messages: [...s.messages, { id: `u-${Date.now()}`, role: 'user', text: trimmed }],
        }))

        try {
          const { context } = get()
          const history = priorMessages
            .filter((m) => m.id !== 'welcome')
            .slice(-10)
            .map((m) => ({ role: m.role, text: m.text }))

          const reply = await processAssistantMessage(trimmed, {
            pathname,
            pcpRole,
            businessUnit,
            userId,
            systemRole,
            context,
            history,
          })

      set((s) => ({
        loading: false,
        context: reply.context ?? s.context,
        messages: [
          ...s.messages,
          {
            id: `b-${Date.now()}`,
            role: 'bot',
            text: reply.text,
            table: reply.table,
            source: reply.source,
            actions: reply.actions,
            links: reply.links,
          },
        ],
      }))
    } catch {
      set((s) => ({
        loading: false,
        messages: [
          ...s.messages,
          {
            id: `e-${Date.now()}`,
            role: 'bot',
            text: 'Sorry, I could not reach the server. Make sure the backend is running.',
          },
        ],
      }))
    }
  },

  clear: (welcome) => {
    set({
      messages: [{ id: 'welcome', role: 'bot', text: welcome }],
      context: { lastMatchedProjectIds: [], lastQueryDescription: '' },
      initialized: true,
    })
  },
}))
