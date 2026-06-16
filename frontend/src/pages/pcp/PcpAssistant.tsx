import { Bot } from 'lucide-react'
import { AssistantPanel } from '@/components/chatbot/AssistantPanel'
import { CHATBOT_NAME } from '@/lib/chatbotEngine'

export function PcpAssistant() {
  return (
    <div className="flex min-h-[min(70dvh,640px)] flex-col animate-fade-in sm:min-h-[calc(100dvh-10rem)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">AI Assistant</h1>
          <p className="text-muted-foreground">{CHATBOT_NAME} — PCP, projects, budgets & skills</p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <AssistantPanel className="w-full" />
      </div>
    </div>
  )
}
