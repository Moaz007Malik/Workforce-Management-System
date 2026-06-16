import { useState } from 'react'
import { Download, FileText, Table } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const reportTypes = [
  { id: 'projects', label: 'Projects Report', description: 'Project status, budget, and profitability' },
  { id: 'resources', label: 'Resource Utilization', description: 'Team capacity and allocation metrics' },
  { id: 'budget', label: 'Budget Report', description: 'Budget vs actual cost analysis' },
  { id: 'employees', label: 'Employees Report', description: 'Workforce directory and skills' },
  { id: 'utilization', label: 'Utilization Report', description: 'Detailed utilization breakdown' },
  { id: 'profitability', label: 'Profitability Report', description: 'Revenue, cost, and margin analysis' },
]

export function Reports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [reportData, setReportData] = useState<{ title: string; data: Record<string, unknown>[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const generateReport = async (type: string) => {
    setLoading(true)
    setSelectedReport(type)
    const data = await api.get<{ title: string; data: Record<string, unknown>[] }>(`/reports/${type}`)
    setReportData(data)
    setLoading(false)
  }

  const exportCSV = () => {
    if (!reportData?.data.length) return
    const headers = Object.keys(reportData.data[0])
    const csv = [
      headers.join(','),
      ...reportData.data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedReport}-report.csv`
    a.click()
  }

  const exportPDF = () => {
    if (!reportData?.data.length) return
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(reportData.title, 14, 20)
    const headers = Object.keys(reportData.data[0])
    const rows = reportData.data.map((row) => headers.map((h) => String(row[h] ?? '')))
    autoTable(doc, { head: [headers], body: rows, startY: 30, styles: { fontSize: 8 } })
    doc.save(`${selectedReport}-report.pdf`)
  }

  return (
    <div className="space-y-4 animate-fade-in min-w-0 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Reports</h1>
        <p className="text-muted-foreground">Generate and export business intelligence reports</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((rt) => (
          <Card
            key={rt.id}
            className="cursor-pointer"
            onClick={() => generateReport(rt.id)}
          >
            <CardContent className="p-5">
              <FileText className="mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">{rt.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{rt.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {reportData && (
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{reportData.title}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV}><Table className="h-4 w-4" /> Export CSV</Button>
              <Button size="sm" onClick={exportPDF}><Download className="h-4 w-4" /> Export PDF</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      {reportData.data[0] && Object.keys(reportData.data[0]).map((key) => (
                        <th key={key} className="pb-2 pr-4 font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="py-2 pr-4">{String(val ?? '—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
