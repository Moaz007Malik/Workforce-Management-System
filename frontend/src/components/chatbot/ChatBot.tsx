import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { X, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CHATBOT_NAME } from '@/lib/chatbotEngine'
import { useAppStore } from '@/stores/useAppStore'
import { useAssistantStore } from '@/stores/useAssistantStore'
import { useChatBotStore } from '@/stores/useChatBotStore'
import { AssistantPanel } from './AssistantPanel'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/lib/useBreakpoint'

export function ChatBot() {
  const location = useLocation()
  const isMobile = useIsMobile()
  const { open, pendingQuery, openChat, closeChat, clearPendingQuery } = useChatBotStore()
  const { pcpRole, businessUnit, currentUserId, systemRole } = useAppStore()
  const send = useAssistantStore((s) => s.send)

  useEffect(() => {
    if (!open || !pendingQuery) return
    const query = pendingQuery
    clearPendingQuery()
    void send(query, location.pathname, pcpRole || 'Requester', businessUnit, currentUserId, systemRole)
  }, [
    open,
    pendingQuery,
    clearPendingQuery,
    send,
    location.pathname,
    pcpRole,
    businessUnit,
    currentUserId,
    systemRole,
  ])

  return (
    <>
      {!open && (
        <Button
          onClick={() => openChat()}
          className={cn(
            'fixed z-50 rounded-full bg-primary shadow-xl hover:bg-primary/90',
            isMobile ? 'bottom-4 right-4 h-12 w-12' : 'bottom-6 right-6 h-14 w-14',
          )}
          size="icon"
          aria-label={`Open ${CHATBOT_NAME}`}
        >
          <Bot className={cn(isMobile ? 'h-5 w-5' : 'h-6 w-6')} />
        </Button>
      )}

      {open && (
        <div
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden border border-border bg-card shadow-2xl',
            isMobile
              ? 'inset-x-0 bottom-0 top-auto max-h-[min(85dvh,640px)] w-full rounded-t-2xl rounded-b-none'
              : 'bottom-6 right-6 h-[min(560px,calc(100dvh-3rem))] w-[min(420px,calc(100vw-2rem))] rounded-2xl',
          )}
        >
          <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <Bot className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{CHATBOT_NAME}</p>
                <p className="truncate text-[10px] text-muted-foreground">PCP, budgets &amp; workforce</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={closeChat}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <AssistantPanel />
          </div>
        </div>
      )}
    </>
  )
}
