import { useEffect, useRef, useState } from 'react'
import { FileText, Upload, X, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  deleteDocument,
  fetchDocuments,
  formatDocumentSize,
  getDocumentDownloadUrl,
  uploadDocumentFile,
} from '@/lib/documents'
import type { DocumentRecord } from '@/types'

interface DocumentUploadSectionProps {
  entityType: 'employee' | 'project'
  entityId?: string | null
  pendingFiles: File[]
  onPendingChange: (files: File[]) => void
  disabled?: boolean
  embedded?: boolean
}

export function DocumentUploadSection({
  entityType,
  entityId,
  pendingFiles,
  onPendingChange,
  disabled,
  embedded,
}: DocumentUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [saved, setSaved] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!entityId) {
      setSaved([])
      return
    }
    setLoading(true)
    fetchDocuments(entityType === 'employee' ? { employeeId: entityId } : { projectId: entityId })
      .then(setSaved)
      .catch(() => setSaved([]))
      .finally(() => setLoading(false))
  }, [entityId, entityType])

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    if (!picked.length) return

    const tooLarge = picked.find((f) => f.size > 5 * 1024 * 1024)
    if (tooLarge) {
      setError(`"${tooLarge.name}" exceeds the 5 MB limit`)
      return
    }
    setError(null)

    if (entityId) {
      setLoading(true)
      Promise.all(picked.map((file) => uploadDocumentFile(entityType, entityId, file)))
        .then((uploaded) => setSaved((prev) => [...uploaded, ...prev]))
        .catch((err) => setError(err instanceof Error ? err.message : 'Upload failed'))
        .finally(() => setLoading(false))
    } else {
      onPendingChange([...pendingFiles, ...picked])
    }
  }

  const removePending = (index: number) => {
    onPendingChange(pendingFiles.filter((_, i) => i !== index))
  }

  const removeSaved = async (id: string) => {
    try {
      await deleteDocument(id)
      setSaved((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove document')
    }
  }

  const label = entityType === 'employee' ? 'Employee Documents' : 'Project Documents'

  return (
    <div className={embedded ? 'space-y-3' : 'space-y-3 rounded-xl border border-dashed border-border bg-muted/20 p-4'}>
      <div className="flex items-center justify-between gap-2">
        {!embedded && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">Contracts, IDs, specs, reports — up to 5 MB each</p>
            </div>
          </div>
        )}
        {embedded && <p className="text-xs text-muted-foreground">Up to 5 MB per document</p>}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`h-8 gap-1.5 shrink-0 ${embedded ? 'ml-auto' : ''}`}
          disabled={disabled || loading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          Attach
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv"
          onChange={handlePick}
        />
      </div>

      {!entityId && pendingFiles.length === 0 && (
        <p className="text-xs text-muted-foreground">Documents will be saved when you create this record.</p>
      )}

      {loading && <p className="text-xs text-muted-foreground">Loading documents...</p>}

      {embedded && !loading && saved.length === 0 && pendingFiles.length === 0 && (
        <p className="text-sm text-muted-foreground">No documents attached yet.</p>
      )}

      {pendingFiles.length > 0 && (
        <ul className="space-y-2">
          {pendingFiles.map((file, i) => (
            <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDocumentSize(file.size)} · pending upload</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" className="action-icon-btn shrink-0" onClick={() => removePending(i)}>
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {saved.length > 0 && (
        <ul className="space-y-2">
          {saved.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDocumentSize(doc.size)}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <a
                  href={getDocumentDownloadUrl(doc.id)}
                  download={doc.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="action-icon-btn inline-flex items-center justify-center rounded-lg hover:bg-muted"
                >
                  <Download />
                </a>
                <Button type="button" variant="ghost" size="icon" className="action-icon-btn text-destructive" onClick={() => removeSaved(doc.id)}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
