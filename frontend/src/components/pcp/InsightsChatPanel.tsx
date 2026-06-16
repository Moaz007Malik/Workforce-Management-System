import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MarkdownContent } from '@/components/ui/MarkdownContent'
import {
  getInsightsSuggestions,
  getInsightsWelcome,
  processInsightsMessage,
  type InsightsData,
} from '@/lib/insightsEngine'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'bot'
  text: string
  source?: string
  actions?: string[]
}

interface InsightsChatPanelProps {
  insights?: InsightsData | null
  className?: string
  pendingQuery?: string | null
  onPendingConsumed?: () => void
}

export function InsightsChatPanel({ insights, className, pendingQuery, onPendingConsumed }: InsightsChatPanelProps) {
  const navigate = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)
  const consumedQuery = useRef<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'bot', text: getInsightsWelcome() },
  ])

  const suggestions = getInsightsSuggestions()

  const handleSend = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: 'user', text: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const reply = await processInsightsMessage(trimmed, insights ?? undefined)
      setMessages((m) => [
        ...m,
        {
          id: `b-${Date.now()}`,
          role: 'bot',
          text: reply.text,
          source: reply.source,
          actions: reply.actions,
        },
      ])
    } catch {
      setMessages((m) => [
        ...m,
        { id: `e-${Date.now()}`, role: 'bot', text: 'Could not load insights. Check that the backend is running.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (!pendingQuery || pendingQuery === consumedQuery.current || loading) return
    consumedQuery.current = pendingQuery
    void handleSend(`Tell me about: ${pendingQuery}`)
    onPendingConsumed?.()
  }, [pendingQuery, loading, onPendingConsumed])

  const handleAction = (action: string) => {
    if (action.startsWith('Create PCP: need-')) {
      navigate(`/pcp/new?need=${action.replace('Create PCP: ', '')}`)
      return
    }
    if (action.includes('Create PCP') || action.includes('need')) {
      navigate('/pcp/new?need=need-1')
      return
    }
    if (action.includes('Executive')) {
      navigate('/pcp/executive')
      return
    }
    if (action.includes('All PCPs') || action.includes('PCPs')) {
      navigate('/pcp/all')
      return
    }
    void handleSend(action)
  }

  return (
    <div className={cn('flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-card', className)}>
      <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">CORVI — AI Insights</p>
          <p className="text-[10px] text-muted-foreground">Rule-based forecasts & sourcing guidance</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  msg.role === 'user' ? 'bg-muted' : 'bg-primary/10 text-primary',
                )}
              >
                {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div
                className={cn(
                  'min-w-0 max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  msg.role === 'user' ? 'bg-primary text-white' : 'bg-muted/60',
                )}
              >
                {msg.role === 'bot' ? (
                  <MarkdownContent content={msg.text} inverted={false} scrollableTables />
                ) : (
                  <span className="whitespace-pre-wrap">{msg.text}</span>
                )}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {msg.actions.map((a) => (
                      <Button
                        key={a}
                        size="sm"
                        variant="outline"
                        className="h-7 border-accent text-xs text-accent"
                        onClick={() => handleAction(a)}
                      >
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
              Analyzing forecasts…
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
                onClick={() => void handleSend(s)}
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
              void handleSend(input)
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about forecasts, needs, or cost risk…"
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
