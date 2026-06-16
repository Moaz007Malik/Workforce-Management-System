import { useEffect, useRef, useState } from 'react'
import { Download, Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import {
  buildDashboardPdf,
  dashboardPdfToBase64,
  downloadDashboardPdf,
  getDashboardPdfFileName,
  type DashboardPdfOptions,
} from '@/lib/dashboardPdfExport'
import type { DashboardMetrics } from '@/types'

interface DashboardExportDialogProps {
  open: boolean
  onClose: () => void
  metrics: DashboardMetrics
  pdfOptions?: DashboardPdfOptions
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function DashboardExportDialog({ open, onClose, metrics, pdfOptions }: DashboardExportDialogProps) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sentMessage, setSentMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const exportedRef = useRef(false)
  const pdfRef = useRef<ReturnType<typeof buildDashboardPdf> | null>(null)

  useEffect(() => {
    if (!open) {
      exportedRef.current = false
      pdfRef.current = null
      setEmail('')
      setSending(false)
      setSentMessage(null)
      setError(null)
      return
    }
    if (exportedRef.current) return
    const doc = buildDashboardPdf(metrics, pdfOptions)
    pdfRef.current = doc
    downloadDashboardPdf(doc)
    exportedRef.current = true
  }, [open, metrics, pdfOptions])

  const handleSendEmail = async () => {
    const trimmed = email.trim()
    if (!isValidEmail(trimmed)) {
      setError('Enter a valid email address')
      return
    }
    setError(null)
    setSending(true)
    setSentMessage(null)
    try {
      const doc = pdfRef.current ?? buildDashboardPdf(metrics, pdfOptions)
      const result = await api.post<{ message: string; mode: string }>('/dashboard/send-report', {
        email: trimmed,
        pdfBase64: dashboardPdfToBase64(doc),
        fileName: getDashboardPdfFileName(),
      })
      setSentMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const handleDownloadAgain = () => {
    const doc = pdfRef.current ?? buildDashboardPdf(metrics, pdfOptions)
    downloadDashboardPdf(doc)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Export Dashboard"
      description="Your dashboard report has been downloaded as a PDF. Optionally send a copy by email."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            className="bg-accent hover:bg-accent/90"
            onClick={handleSendEmail}
            disabled={sending || !email.trim()}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send to Email
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-medium text-emerald-800 dark:text-emerald-300">PDF exported</p>
            <p className="mt-1 text-muted-foreground">
              KPIs, project budgets, profitability, and spending are included in the report.
            </p>
            <Button variant="ghost" className="mt-1 h-auto p-0 text-accent" onClick={handleDownloadAgain}>
              <Download className="h-3.5 w-3.5" /> Download again
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dashboard-export-email">Send PDF to email</Label>
          <Input
            id="dashboard-export-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); setSentMessage(null) }}
            onKeyDown={(e) => e.key === 'Enter' && handleSendEmail()}
          />
          <p className="text-xs text-muted-foreground">
            The same PDF will be attached to the email.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {sentMessage && (
          <p className="text-sm text-emerald-600">{sentMessage}</p>
        )}
      </div>
    </Dialog>
  )
}
