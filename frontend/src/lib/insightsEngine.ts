import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

export interface InsightNeed {
  id: string
  title: string
  description: string
  recommendation: string
  recommendationType: string
  reasoning: string
  timeToFillInHouse?: number
  timeToFillExternal?: number
  inHouseMatches?: number
}

export interface InsightsData {
  needs?: InsightNeed[]
  headcountForecast?: {
    labels: string[]
    actual: (number | null)[]
    projected: (number | null)[]
    confidenceLow?: (number | null)[]
    confidenceHigh?: (number | null)[]
  }
  costForecast?: {
    months: string[]
    projected: number[]
    budget: number[]
    atRisk: { costCenter: string; variance: number; note: string }[]
  }
  weeklySummary?: string
}

export interface InsightsReply {
  text: string
  source?: string
  actions?: string[]
}

let cached: InsightsData | null = null

export async function loadInsights(): Promise<InsightsData> {
  if (cached) return cached
  cached = await api.get<InsightsData>('/pcp/insights')
  return cached
}

export function clearInsightsCache() {
  cached = null
}

function mdTable(rows: Record<string, string | number>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  return [
    '',
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((h) => String(row[h] ?? '')).join(' | ')} |`),
  ].join('\n')
}

function helpText(): string {
  return [
    '## CORVI — AI Insights',
    '',
    'Ask me about:',
    '- **Weekly summary** — "summarize this week"',
    '- **Sourcing needs** — "show identified needs" or "welder recommendation"',
    '- **Headcount forecast** — "headcount forecast for Aug"',
    '- **Cost forecast** — "cost forecast" or "which cost centers are at risk"',
    '- **Time to fill** — "compare in-house vs agency fill time"',
  ].join('\n')
}

export async function processInsightsMessage(message: string, data?: InsightsData): Promise<InsightsReply> {
  const insights = data ?? await loadInsights()
  const lower = message.trim().toLowerCase()
  if (!lower) return { text: 'Please type a question about forecasts or sourcing needs.' }

  if (lower === 'help' || lower === 'hi' || lower === 'hello') {
    return { text: helpText(), source: 'CORVI — rule-based insights engine' }
  }

  if (lower.startsWith('tell me about:') || lower.startsWith('tell me about ')) {
    const topic = message.replace(/^tell me about:?\s*/i, '').trim().toLowerCase()
    const need = insights.needs?.find(
      (n) => n.title.toLowerCase().includes(topic) || topic.includes(n.title.toLowerCase().slice(0, 20)),
    )
    if (need) {
      return {
        text: [
          `## ${need.title}`,
          '',
          need.description,
          '',
          `**Recommendation:** ${need.recommendation}`,
          '',
          need.reasoning,
          need.timeToFillInHouse != null
            ? `\nIn-house: **${need.timeToFillInHouse}d** · Agency: **${need.timeToFillExternal}d**`
            : '',
        ].join('\n'),
        source: 'Need identification · AI Insights',
        actions: [`Create PCP: ${need.id}`],
      }
    }
  }

  if (lower.includes('weekly') || lower.includes('summarize this week') || lower.includes('summary')) {
    return {
      text: `## Weekly Summary\n\n${insights.weeklySummary || 'No summary available.'}`,
      source: 'AI Insights · week ending Jun 2026',
      actions: ['View Executive Dashboard'],
    }
  }

  if (
    lower.includes('need') ||
    lower.includes('sourcing') ||
    lower.includes('identified') ||
    lower.includes('recommendation')
  ) {
    const needs = insights.needs ?? []
    if (!needs.length) {
      return { text: 'No identified needs in the current forecast period.' }
    }
    const lines = needs.map(
      (n, i) =>
        `### ${i + 1}. ${n.title}\n${n.description}\n\n**Recommendation:** ${n.recommendation}\n\n${n.reasoning}${
          n.timeToFillInHouse != null
            ? `\n\nIn-house fill: **${n.timeToFillInHouse}d** · Agency: **${n.timeToFillExternal}d** · In-house matches: **${n.inHouseMatches ?? 0}**`
            : n.inHouseMatches != null
              ? `\n\nIn-house matches: **${n.inHouseMatches}**`
              : ''
        }`,
    )
    return {
      text: `## Need Identification & Sourcing\n\n${lines.join('\n\n---\n\n')}`,
      source: 'PCP pipeline + workforce availability model',
      actions: needs.map((n) => `Create PCP: ${n.id}`),
    }
  }

  if (lower.includes('welder') || lower.includes('ruwais') || lower.includes('agency')) {
    const need = insights.needs?.find((n) => n.recommendationType === 'external') ?? insights.needs?.[0]
    if (!need) return { text: 'No welder / Ruwais forecast available.' }
    return {
      text: [
        `## ${need.title}`,
        '',
        need.description,
        '',
        `**${need.recommendation}**`,
        '',
        need.reasoning,
        '',
        `| Channel | Est. time-to-fill |`,
        `| --- | --- |`,
        `| In-house | ${need.timeToFillInHouse ?? '—'} days |`,
        `| External agency | ${need.timeToFillExternal ?? '—'} days |`,
      ].join('\n'),
      source: 'Ruwais trade availability · confidence 75%',
      actions: ['Create PCP from this need'],
    }
  }

  if (lower.includes('electrician') || lower.includes('ageing') || lower.includes('aging') || lower.includes('night')) {
    const need = insights.needs?.find((n) => n.title.toLowerCase().includes('electrician')) ?? insights.needs?.[1]
    if (!need) return { text: 'No electrician ageing insight available.' }
    return {
      text: [
        `## ${need.title}`,
        '',
        need.description,
        '',
        `**${need.recommendation}** — ${need.reasoning}`,
        '',
        'Night-shift revisions on ADNOC Refinery Electrical Turnaround added **AED 14,000/month** since Rev. 1.',
      ].join('\n'),
      source: 'Vacancy ageing tracker · ADNOC Refinery',
      actions: ['Create PCP from this need'],
    }
  }

  if (lower.includes('headcount') || lower.includes('forecast') && !lower.includes('cost')) {
    const hf = insights.headcountForecast
    if (!hf) return { text: 'Headcount forecast data is not loaded.' }
    const rows = hf.labels.map((label, i) => ({
      Month: label,
      Actual: hf.actual[i] ?? '—',
      Projected: hf.projected[i] ?? '—',
      'Conf. low': hf.confidenceLow?.[i] ?? '—',
      'Conf. high': hf.confidenceHigh?.[i] ?? '—',
    }))
    const lastProjected = [...(hf.projected ?? [])].reverse().find((v) => v != null)
    return {
      text: `## Headcount Forecast\n\nPeak projected headcount: **${lastProjected?.toLocaleString() ?? '—'}** by Aug 2026.${mdTable(rows as Record<string, string | number>[])}`,
      source: 'Rolling 8-month workforce model',
    }
  }

  if (
    lower.includes('cost') ||
    lower.includes('budget') ||
    lower.includes('over budget') ||
    lower.includes('at risk') ||
    lower.includes('cc104') ||
    lower.includes('variance')
  ) {
    const cf = insights.costForecast
    if (!cf) return { text: 'Cost forecast data is not loaded.' }
    const rows = cf.months.map((m, i) => ({
      Month: m,
      Budget: formatCurrency(cf.budget[i]),
      Projected: formatCurrency(cf.projected[i]),
      Variance: cf.budget[i]
        ? `${Math.round(((cf.projected[i] - cf.budget[i]) / cf.budget[i]) * 100)}%`
        : '—',
    }))
    const atRisk = cf.atRisk
      .map((r) => `- **${r.costCenter}** (+${r.variance}%) — ${r.note}`)
      .join('\n')
    return {
      text: `## Cost Forecast & Variance Risk\n\n${atRisk ? `### At-risk cost centers\n${atRisk}\n` : ''}${mdTable(rows as Record<string, string | number>[])}`,
      source: 'Approved PCP costing · H2 2026 projection',
      actions: ['View Executive Dashboard'],
    }
  }

  if (lower.includes('time to fill') || lower.includes('time-to-fill') || lower.includes('in-house') || lower.includes('compare')) {
    const needs = insights.needs?.filter((n) => n.timeToFillInHouse != null) ?? []
    if (!needs.length) return { text: 'No time-to-fill comparisons available.' }
    const rows = needs.map((n) => ({
      Need: n.title.slice(0, 40) + (n.title.length > 40 ? '…' : ''),
      'In-house (days)': n.timeToFillInHouse ?? '—',
      'Agency (days)': n.timeToFillExternal ?? '—',
      Saving: n.timeToFillInHouse && n.timeToFillExternal
        ? `${n.timeToFillInHouse - n.timeToFillExternal}d`
        : '—',
    }))
    return {
      text: `## Time-to-Fill Comparison\n\nAgency channel is faster for urgent Ruwais trades.${mdTable(rows as Record<string, string | number>[])}`,
      source: 'Historical fill rates · Q1–Q2 2026',
    }
  }

  if (lower.includes('cost center') && lower.includes('quarter')) {
    return processInsightsMessage('which cost centers are over budget', insights)
  }

  if (lower.includes('open pcp') || lower.includes('summarize open')) {
    return {
      text: '## Open PCP Activity\n\n**3** PCPs in approval · **2** approved this month · Avg TAT **2.1 days**. Electrician vacancies on ADNOC Refinery are the highest ageing risk.',
      source: 'PCP workflow · Jun 2026',
      actions: ['View All PCPs'],
    }
  }

  return {
    text: `${helpText()}\n\n_I didn't match "${message}" — try a suggestion below._`,
    source: 'CORVI — rule-based insights engine',
  }
}

export function getInsightsWelcome(): string {
  return [
    'Hi! I\'m **CORVI**. I can explain the forecasts and sourcing recommendations on this page — all answers are generated from your PCP and workforce data.',
    '',
    'Try: *"Show identified needs"* or *"Which cost centers are at risk?"*',
  ].join('\n')
}

export function getInsightsSuggestions(): string[] {
  return [
    'Summarize this week',
    'Show identified needs',
    'Headcount forecast for Aug',
    'Which cost centers are at risk?',
    'Compare in-house vs agency fill time',
    'Electrician vacancies ageing',
  ]
}

export function getNeedPrefill(needId: string): {
  client: string
  clientLocation: string
  businessUnit: string
  positions: { title: string; jobFamily: string; count: number; shift: string }[]
} | null {
  const map: Record<string, ReturnType<typeof getNeedPrefill>> = {
    'need-1': {
      client: 'Ruwais Piping & Welding Package',
      clientLocation: 'Ruwais',
      businessUnit: 'Construction – North',
      positions: [
        { title: 'Welder', jobFamily: 'Mechanical', count: 14, shift: 'Day' },
        { title: 'Rigger', jobFamily: 'Mechanical', count: 6, shift: 'Day' },
      ],
    },
    'need-2': {
      client: 'ADNOC Refinery Electrical Turnaround',
      clientLocation: 'Abu Dhabi',
      businessUnit: 'Construction – North',
      positions: [
        { title: 'Electrician', jobFamily: 'Electrical', count: 3, shift: 'Night' },
      ],
    },
  }
  return map[needId] ?? null
}
