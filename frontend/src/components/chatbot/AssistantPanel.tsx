import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { MarkdownContent } from '@/components/ui/MarkdownContent'
import { getAssistantSuggestions, getAssistantWelcome } from '@/lib/assistantEngine'
import { useAssistantStore } from '@/stores/useAssistantStore'
import { useAppStore } from '@/stores/useAppStore'

interface AssistantPanelProps {
  className?: string
}

export function AssistantPanel({ className }: AssistantPanelProps) {
  const location = useLocation()
  const { pcpRole, businessUnit, currentUserId, systemRole } = useAppStore()
  const { messages, loading, initWelcome, send } = useAssistantStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')

  const welcome = getAssistantWelcome(location.pathname)
  const suggestions = getAssistantSuggestions(location.pathname)

  useEffect(() => {
    initWelcome(location.pathname, welcome)
  }, [initWelcome, location.pathname, welcome])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = (text: string) => {
    const msg = text.trim()
    if (!msg) return
    send(msg, location.pathname, pcpRole || 'Requester', businessUnit, currentUserId, systemRole)
    setInput('')
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  msg.role === 'user' ? 'bg-muted' : 'bg-primary/10 text-primary'
                )}
              >
                {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div
                className={cn(
                  'min-w-0 max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-muted/60 text-foreground'
                )}
              >
                {msg.role === 'bot' ? (
                  <MarkdownContent content={msg.text} inverted={false} scrollableTables />
                ) : (
                  <span className="whitespace-pre-wrap">{msg.text}</span>
                )}
                {msg.table && msg.table.length > 0 && !msg.text.includes('|') && (
                  <div className="chat-table-scroll mt-3">
                    <table className="w-max min-w-full text-xs">
                      <thead>
                        <tr>
                          {Object.keys(msg.table[0]).map((k) => (
                            <th key={k} className="px-2 py-1.5 text-left font-semibold">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.table.map((row, ri) => (
                          <tr key={ri} className="border-t border-border">
                            {Object.values(row).map((v, ci) => (
                              <td key={ci} className="px-2 py-1.5">{String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {msg.links && msg.links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 items-center rounded-md border border-accent px-2.5 text-xs text-accent transition-colors hover:bg-accent/10"
                      >
                        {link.platform}
                      </a>
                    ))}
                  </div>
                )}
                {msg.actions && msg.actions.length > 0 && !msg.links?.length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.actions.map((a) => (
                      <Button key={a} size="sm" variant="outline" className="h-7 border-accent text-xs text-accent">
                        {a}
                      </Button>
                    ))}
                  </div>
                )}
                {msg.source && (
                  <p className="mt-2 text-[10px] text-muted-foreground">Based on: {msg.source}</p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSend(s)}
                disabled={loading}
                className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:bg-muted disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend(input)
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about projects, PCPs, budgets, or skills…"
              disabled={loading}
              className="flex-1"
            />
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              size="icon"
              disabled={loading || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
