import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Project } from '@/types'

interface ProjectState {
  projects: Project[]
  loading: boolean
  selectedProject: Project | null
  fetchProjects: () => Promise<void>
  setSelectedProject: (project: Project | null) => void
  createProject: (data: Partial<Project>) => Promise<Project>
  updateProject: (id: string, data: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  selectedProject: null,
  fetchProjects: async () => {
    set({ loading: true })
    try {
      const projects = await api.get<Project[]>('/projects')
      set({ projects, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  setSelectedProject: (project) => set({ selectedProject: project }),
  createProject: async (data) => {
    const project = await api.post<Project>('/projects', data)
    set({ projects: [...get().projects, project] })
    return project
  },
  updateProject: async (id, data) => {
    const updated = await api.put<Project>(`/projects/${id}`, data)
    set({
      projects: get().projects.map((p) => (p.id === id ? updated : p)),
      selectedProject: get().selectedProject?.id === id ? updated : get().selectedProject,
    })
  },
  deleteProject: async (id) => {
    await api.delete(`/projects/${id}`)
    set({ projects: get().projects.filter((p) => p.id !== id) })
  },
}))
