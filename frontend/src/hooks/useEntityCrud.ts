import { useState } from 'react'
import { api } from '@/lib/api'

export function useEntityCrud<T>(endpoint: string, onSuccess?: () => void) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async (data: Partial<T>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.post<T>(endpoint, data)
      onSuccess?.()
      return result
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
      throw e
    } finally {
      setLoading(false)
    }
  }

  const update = async (id: string, data: Partial<T>) => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.put<T>(`${endpoint}/${id}`, data)
      onSuccess?.()
      return result
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update')
      throw e
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await api.delete(`${endpoint}/${id}`)
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
      throw e
    } finally {
      setLoading(false)
    }
  }

  return { create, update, remove, loading, error, setError }
}
