import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, ComposedChart, Legend } from 'recharts'
import { MessageCircle, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InsightsChatPanel } from '@/components/pcp/InsightsChatPanel'
import { usePcpStore } from '@/stores/usePcpStore'
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import { useThemeColors } from '@/lib/useThemeColors'
import type { InsightsData } from '@/lib/insightsEngine'

export function PcpAiInsights() {
  const navigate = useNavigate()
  const { insights, fetchInsights } = usePcpStore()
  const { accentFill, primaryFill, accentFillSoft } = useThemeColors()
  const [chatQuery, setChatQuery] = useState<string | null>(null)

  useEffect(() => { void fetchInsights() }, [fetchInsights])

  const data = insights as InsightsData | null

  if (!data) return <p className="text-muted-foreground">Loading AI insights...</p>

  const forecastChart = data.headcountForecast?.labels.map((label, i) => ({
    month: label,
    actual: data.headcountForecast!.actual[i],
    projected: data.headcountForecast!.projected[i],
    confLow: data.headcountForecast!.confidenceLow?.[i],
    confHigh: data.headcountForecast!.confidenceHigh?.[i],
  })) || []

  const costChart = data.costForecast?.months.map((m, i) => ({
    month: m,
    projected: data.costForecast!.projected[i],
    budget: data.costForecast!.budget[i],
    overBudget: data.costForecast!.projected[i] > data.costForecast!.budget[i],
  })) || []

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">AI Insights & Forecasts</span>
          </div>
          <h1 className="text-xl font-bold sm:text-2xl">Workforce Intelligence</h1>
          <p className="text-muted-foreground">Sourcing recommendations, headcount & cost projections — powered by CORVI (rule-based)</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/pcp/executive')}>
          View Executive Dashboard
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-[1fr_min(380px,100%)]">
        <div className="order-2 min-w-0 xl:order-1">
          <Card>
            <CardHeader><CardTitle>Need Identification & Sourcing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {data.needs?.map((n) => (
                <div key={n.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{n.title}</p>
                      <p className="text-sm text-muted-foreground">{n.description}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${n.recommendationType === 'inhouse' ? 'bg-accent/15 text-accent' : 'bg-primary/15 text-primary'}`}>
                      {n.recommendation}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{n.reasoning}</p>
                  {n.timeToFillInHouse != null && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      In-house fill: <strong>{n.timeToFillInHouse}d</strong> · Agency: <strong>{n.timeToFillExternal}d</strong>
                      {n.inHouseMatches != null && <> · In-house matches: <strong>{n.inHouseMatches}</strong></>}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to={`/pcp/new?need=${n.id}`}>
                      <Button size="sm">Create PCP from this need</Button>
                    </Link>
                    <Button size="sm" variant="outline" onClick={() => setChatQuery(n.title)}>
                      <MessageCircle className="mr-1 h-3.5 w-3.5" />
                      Ask CORVI
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Headcount Forecast</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecastChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="confHigh" fill={accentFillSoft} stroke="none" name="Conf. high" connectNulls />
                    <Area type="monotone" dataKey="confLow" fill="transparent" stroke="none" name="Conf. low" connectNulls />
                    <Line type="monotone" dataKey="actual" stroke={accentFill} strokeWidth={2} dot name="Actual" connectNulls />
                    <Line type="monotone" dataKey="projected" stroke={primaryFill} strokeWidth={2} strokeDasharray="5 5" dot name="Projected" connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Cost Forecast & Variance Risk</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={costChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis tickFormatter={(v) => formatCurrencyCompact(Number(v))} fontSize={12} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Legend />
                    <Area type="monotone" dataKey="budget" fill={accentFillSoft} stroke={accentFill} name="Budget" />
                    <Line type="monotone" dataKey="projected" stroke={primaryFill} strokeWidth={2} name="Projected" dot />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>At-Risk Cost Centers</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.costForecast?.atRisk.map((r) => (
                <button
                  key={r.costCenter}
                  type="button"
                  className="block w-full rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10"
                  onClick={() => navigate('/pcp/executive')}
                >
                  <strong>{r.costCenter}</strong> (+{r.variance}%) — {r.note}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-accent/20 bg-accent/5">
            <CardHeader><CardTitle>Weekly Summary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{data.weeklySummary}</p>
            </CardContent>
          </Card>
        </div>

        <div className="order-1 xl:sticky xl:top-20 xl:order-2 xl:self-start">
          <InsightsChatPanel
            insights={data}
            className="min-h-[420px] xl:max-h-[calc(100dvh-7rem)]"
            pendingQuery={chatQuery}
            onPendingConsumed={() => setChatQuery(null)}
          />
        </div>
      </div>
    </div>
  )
}
