import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Task, AssigneeSuggestion } from '@/types'

interface TaskState {
  tasks: Task[]
  loading: boolean
  fetchTasks: () => Promise<void>
  createTask: (data: Partial<Task>) => Promise<Task>
  updateTask: (id: string, data: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  getTasksByProject: (projectId: string) => Task[]
  getAssigneeSuggestions: (skills?: string[], taskId?: string) => Promise<AssigneeSuggestion[]>
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  fetchTasks: async () => {
    set({ loading: true })
    try {
      const tasks = await api.get<Task[]>('/tasks')
      set({ tasks, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  createTask: async (data) => {
    const task = await api.post<Task>('/tasks', data)
    set({ tasks: [...get().tasks, task] })
    return task
  },
  updateTask: async (id, data) => {
    const updated = await api.put<Task>(`/tasks/${id}`, data)
    set({ tasks: get().tasks.map((t) => (t.id === id ? updated : t)) })
  },
  deleteTask: async (id) => {
    await api.delete(`/tasks/${id}`)
    set({ tasks: get().tasks.filter((t) => t.id !== id) })
  },
  getTasksByProject: (projectId) => get().tasks.filter((t) => t.projectId === projectId),
  getAssigneeSuggestions: async (skills, taskId) => {
    const params = new URLSearchParams()
    if (skills?.length) params.set('skills', skills.join(','))
    if (taskId) params.set('taskId', taskId)
    const qs = params.toString() ? `?${params}` : ''
    return api.get<AssigneeSuggestion[]>(`/assignees/suggestions${qs}`)
  },
}))
