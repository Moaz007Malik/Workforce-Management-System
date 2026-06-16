import { api } from '@/lib/api'
import { CHATBOT_NAME, processChatMessage, tryDashboardFaq, type ChatContext } from '@/lib/chatbotEngine'
import { processInsightsMessage, getInsightsWelcome, getInsightsSuggestions } from '@/lib/insightsEngine'

export interface AssistantLink {
  platform: string
  url: string
  label: string
}

export interface AssistantReply {
  text: string
  table?: Record<string, unknown>[]
  source?: string
  actions?: string[]
  links?: AssistantLink[]
  context?: ChatContext
}

const PCP_KEYWORDS = /pcp|cost center|revision|vacant|electrician|welder|approv|headcount|personnel|recruitment|shift|charging|ruwais|demob|forecast|insight|sourcing|agency|ageing|aging|weekly summary|at risk|variance/i

function isInsightsQuery(message: string): boolean {
  return /forecast|insight|sourcing|weekly|need identification|headcount projection|cost forecast|at risk|time to fill|time-to-fill|agency|ageing|aging|welder.*ruwais|cc104|variance risk/i.test(message)
}

export function isPcpContext(pathname: string, message?: string): boolean {
  if (pathname.startsWith('/pcp')) return true
  if (pathname.startsWith('/admin')) return true
  if (message && PCP_KEYWORDS.test(message)) return true
  return false
}

export function getAssistantWelcome(pathname: string): string {
  if (pathname.startsWith('/pcp/insights')) {
    return getInsightsWelcome()
  }
  if (pathname.startsWith('/pcp') || pathname.startsWith('/admin')) {
    return `Hi! I'm **${CHATBOT_NAME}**. Ask about PCPs, positions, budgets, approvals, and forecasts.`
  }
  return `Hi! I'm **${CHATBOT_NAME}**. Ask about your projects, team skills, budgets, or hiring needs.`
}

export function getAssistantSuggestions(pathname: string): string[] {
  if (pathname.startsWith('/pcp/insights')) {
    return getInsightsSuggestions()
  }
  if (pathname.startsWith('/pcp') || pathname.startsWith('/admin')) {
    return [
      'Which cost centers are over budget this quarter?',
      'Summarize open PCPs in my business unit',
      'Show vacant electrician positions',
      'Compare revision history for latest PCP',
    ]
  }
  return [
    'Summarize all active projects and their budgets',
    'Show employees with React skills in our database',
    'Which projects are over budget?',
    'List pending approval items',
  ]
}

interface ChatHistoryMessage {
  role: 'user' | 'bot'
  text: string
}

export async function processAssistantMessage(
  message: string,
  options: {
    pathname: string
    pcpRole: string
    businessUnit: string
    userId?: string
    systemRole?: string
    context: ChatContext
    history?: ChatHistoryMessage[]
  },
): Promise<AssistantReply> {
  const { pathname, pcpRole, businessUnit, userId, context } = options

  if (pathname.startsWith('/pcp/insights') || isInsightsQuery(message)) {
    const res = await processInsightsMessage(message)
    return {
      text: res.text,
      source: res.source,
      actions: res.actions,
      context,
    }
  }

  const faq = tryDashboardFaq(message)
  if (faq.matched) {
    return { text: faq.reply, context }
  }

  if (isPcpContext(pathname, message)) {
    const res = await api.post<{
      text?: string
      table?: Record<string, unknown>[]
      source?: string
      actions?: string[]
      links?: AssistantLink[]
    }>('/pcp/assistant', { message, role: pcpRole, businessUnit, userId })

    let text = String(res.text || '')
    if (res.table?.length) {
      const headers = Object.keys(res.table[0])
      text += `\n\n| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n`
      text += res.table.map((row) => `| ${headers.map((h) => String(row[h] ?? '')).join(' | ')} |`).join('\n')
    }

    return {
      text,
      table: res.table,
      source: res.source,
      actions: res.actions,
      links: res.links,
      context,
    }
  }

  const { reply, context: nextContext } = await processChatMessage(message, context)
  return { text: reply, context: nextContext }
}
