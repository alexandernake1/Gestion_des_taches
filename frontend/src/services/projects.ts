import { api } from '@/utils/api'
import type { Project } from '@/domain/types'

export interface CreateProjectPayload {
  name: string
  description?: string
  status?: string
  health?: string
  start_date?: string
  due_date?: string
  manager?: number
  members?: number[]
  teams?: number[]
  budget_hours?: number
}

export interface UpdateProjectPayload extends Partial<CreateProjectPayload> {}

export const projectsService = {
  list: async (params?: { status?: string; health?: string; search?: string }): Promise<Project[]> => {
    const data = await api.get<Project[] | { results: Project[] }>('/projects/', { params })
    if (Array.isArray(data)) return data
    return data.results || []
  },

  getById: async (id: number): Promise<Project> => {
    return api.get<Project>(`/projects/${id}/`)
  },

  create: async (payload: CreateProjectPayload): Promise<Project> => {
    return api.post<Project>('/projects/', payload)
  },

  update: async (id: number, payload: UpdateProjectPayload): Promise<Project> => {
    return api.patch<Project>(`/projects/${id}/`, payload)
  },

  delete: async (id: number): Promise<void> => {
    return api.delete<void>(`/projects/${id}/`)
  },
}
