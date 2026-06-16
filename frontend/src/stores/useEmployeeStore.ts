import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Employee, CapacityForecast } from '@/types'

interface EmployeeState {
  employees: Employee[]
  loading: boolean
  fetchEmployees: () => Promise<void>
  getEmployeeById: (id: string) => Employee | undefined
  getCapacityForecast: (id: string) => Promise<CapacityForecast>
  createEmployee: (data: Partial<Employee>) => Promise<Employee>
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>
}

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  loading: false,
  fetchEmployees: async () => {
    set({ loading: true })
    try {
      const employees = await api.get<Employee[]>('/employees')
      set({ employees, loading: false })
    } catch {
      set({ loading: false })
    }
  },
  getEmployeeById: (id) => get().employees.find((e) => e.id === id),
  getCapacityForecast: async (id) => api.get<CapacityForecast>(`/employees/${id}/capacity`),
  createEmployee: async (data) => {
    const employee = await api.post<Employee>('/employees', data)
    set({ employees: [...get().employees, employee] })
    return employee
  },
  updateEmployee: async (id, data) => {
    const updated = await api.put<Employee>(`/employees/${id}`, data)
    set({ employees: get().employees.map((e) => (e.id === id ? updated : e)) })
  },
  deleteEmployee: async (id) => {
    await api.delete(`/employees/${id}`)
    set({ employees: get().employees.filter((e) => e.id !== id) })
  },
}))
