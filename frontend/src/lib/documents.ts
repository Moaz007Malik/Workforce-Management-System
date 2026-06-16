import { api } from '@/lib/api'
import type { DocumentRecord } from '@/types'

const MAX_BYTES = 5 * 1024 * 1024

function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim()
  if (!raw) return '/api'
  let base = raw
  if (!/^https?:\/\//i.test(base)) base = `http://${base}`
  base = base.replace(/\/$/, '')
  if (!base.endsWith('/api')) base = `${base}/api`
  return base
}

export function formatDocumentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getDocumentDownloadUrl(id: string): string {
  return `${resolveApiBase()}/documents/${id}/download`
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      if (!base64) reject(new Error('Could not read file'))
      else resolve(base64)
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export async function fetchDocuments(params: { employeeId?: string; projectId?: string }) {
  const query = params.employeeId
    ? `?employeeId=${encodeURIComponent(params.employeeId)}`
    : params.projectId
    ? `?projectId=${encodeURIComponent(params.projectId)}`
    : ''
  return api.get<DocumentRecord[]>(`/documents${query}`)
}

export async function uploadDocument(data: {
  entityType: 'employee' | 'project'
  entityId: string
  title?: string
  fileName: string
  mimeType: string
  content: string
}) {
  return api.post<DocumentRecord>('/documents', data)
}

export async function deleteDocument(id: string) {
  return api.delete(`/documents/${id}`)
}

export async function uploadDocumentFile(
  entityType: 'employee' | 'project',
  entityId: string,
  file: File,
  title?: string
) {
  if (file.size > MAX_BYTES) {
    throw new Error(`"${file.name}" exceeds the 5 MB limit`)
  }
  const content = await fileToBase64(file)
  return uploadDocument({
    entityType,
    entityId,
    title: title?.trim() || file.name,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    content,
  })
}

export async function uploadPendingDocuments(
  entityType: 'employee' | 'project',
  entityId: string,
  files: File[]
) {
  for (const file of files) {
    await uploadDocumentFile(entityType, entityId, file)
  }
}
