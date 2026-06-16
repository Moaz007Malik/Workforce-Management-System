import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { DashboardMetrics } from '@/types'
import { formatCurrency, formatPercent } from '@/lib/utils'

export interface PcpDashboardExport {
  total: number
  inApproval: number
  approved: number
  draft: number
  monthly: number
  slaAtRisk?: number
}

export interface DashboardPdfOptions {
  scopeLabel?: string
  pcpStats?: PcpDashboardExport | null
}

function defaultFileName() {
  return `descon-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`
}

export function buildDashboardPdf(metrics: DashboardMetrics, options?: DashboardPdfOptions): jsPDF {
  const doc = new jsPDF()
  const { kpis } = metrics
  let y = 18

  doc.setFontSize(18)
  doc.text('Descon — Personnel Cost Planning Report', 14, y)
  y += 7
  doc.setFontSize(10)
  doc.setTextColor(90)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y)
  if (options?.scopeLabel) {
    y += 5
    doc.text(`Scope: ${options.scopeLabel}`, 14, y)
  }
  y += 8
  doc.setTextColor(0)

  const kpiRows: string[][] = [
    ['Active Projects', String(kpis.activeProjects), `${kpis.totalProjects} total · ${kpis.completedProjects} completed`],
    ['Employees', String(kpis.totalEmployees), `${kpis.availableResources} available · ${kpis.allocatedResources} allocated`],
    ['Budget Utilization', formatPercent(kpis.budgetUtilization), `${formatCurrency(kpis.totalActualCost)} of ${formatCurrency(kpis.totalBudget)} spent`],
    ['Actual Project Cost', formatCurrency(kpis.totalActualCost), `${formatCurrency(kpis.totalPlannedCost)} planned`],
    ['Revenue', formatCurrency(kpis.totalRevenue), `${formatPercent(kpis.profitMargin)} margin · ${formatCurrency(kpis.profit)} profit`],
  ]

  if (options?.pcpStats) {
    const p = options.pcpStats
    const pipeline = [
      p.inApproval ? `${p.inApproval} in approval` : null,
      p.approved ? `${p.approved} approved` : null,
      p.draft ? `${p.draft} draft` : null,
    ].filter(Boolean).join(' · ') || 'No requests yet'
    kpiRows.push(['PCP Pipeline', String(p.total), pipeline])
    kpiRows.push(['Planned Personnel Cost', formatCurrency(p.monthly), 'Monthly run-rate from open PCPs'])
    if (p.slaAtRisk && p.slaAtRisk > 0) {
      kpiRows.push(['Approvals at SLA Risk', String(p.slaAtRisk), 'Under 24 hours remaining'])
    }
  }

  autoTable(doc, {
    head: [['KPI', 'Value', 'Details']],
    body: kpiRows,
    startY: y,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [227, 30, 36] },
  })

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  if (metrics.projectStatusDistribution.some((s) => s.count > 0)) {
    doc.setFontSize(12)
    doc.text('Project Status', 14, y)
    y += 4
    autoTable(doc, {
      head: [['Status', 'Count']],
      body: metrics.projectStatusDistribution.filter((s) => s.count > 0).map((s) => [s.status, String(s.count)]),
      startY: y,
      styles: { fontSize: 9 },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  if (metrics.budgetVsActual.length > 0) {
    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFontSize(12)
    doc.text('Budget vs Actual by Project', 14, y)
    y += 4
    autoTable(doc, {
      head: [['Project', 'Budget', 'Planned', 'Actual']],
      body: metrics.budgetVsActual.map((r) => [
        r.name,
        formatCurrency(r.budget),
        formatCurrency(r.planned),
        formatCurrency(r.actual),
      ]),
      startY: y,
      styles: { fontSize: 8 },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  if (metrics.projectProfitability.length > 0) {
    if (y > 220) { doc.addPage(); y = 20 }
    doc.setFontSize(12)
    doc.text('Project Profitability', 14, y)
    y += 4
    autoTable(doc, {
      head: [['Project', 'Revenue', 'Actual Cost', 'Profit', 'Margin']],
      body: metrics.projectProfitability.map((p) => [
        p.projectName,
        formatCurrency(p.revenue),
        formatCurrency(p.actualCost),
        formatCurrency(p.profit),
        `${p.margin}%`,
      ]),
      startY: y,
      styles: { fontSize: 8 },
    })
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  if (metrics.monthlySpending.length > 0) {
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFontSize(12)
    doc.text('Monthly Spending (last 6 months)', 14, y)
    y += 4
    autoTable(doc, {
      head: [['Month', 'Cost']],
      body: metrics.monthlySpending.map((m) => [m.month, formatCurrency(m.cost)]),
      startY: y,
      styles: { fontSize: 9 },
    })
  }

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(130)
    doc.text('Powered By Corvit', doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
  }

  return doc
}

export function downloadDashboardPdf(doc: jsPDF, filename = defaultFileName()) {
  doc.save(filename)
}

export function dashboardPdfToBase64(doc: jsPDF): string {
  return doc.output('datauristring').split(',')[1] ?? ''
}

export function getDashboardPdfFileName() {
  return defaultFileName()
}
