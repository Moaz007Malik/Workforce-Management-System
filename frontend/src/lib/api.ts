import { getAuthToken } from '@/lib/auth'
import { clearAuthSession } from '@/stores/useAuthStore'

function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim()
  if (!raw) return '/api'

  let base = raw
  if (!/^https?:\/\//i.test(base)) {
    base = `http://${base}`
  }
  base = base.replace(/\/$/, '')
  if (!base.endsWith('/api')) {
    base = `${base}/api`
  }
  return base
}

const API_BASE = resolveApiBase()

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, headers: customHeaders, ...rest } = options
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  }
  if (!skipAuth) {
    const token = getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...rest, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (res.status === 401 && !skipAuth) {
      clearAuthSession()
    }
    throw new Error(body.error || `API error: ${res.statusText}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) => request<T>(endpoint, options),
  post: <T>(endpoint: string, data: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data), ...options }),
  put: <T>(endpoint: string, data: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data), ...options }),
  patch: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined, ...options }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),
}
