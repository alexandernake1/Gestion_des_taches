import { api } from '@/utils/api'
import type { Team, TeamCreateRequest, TeamUpdateRequest } from '@/domain/types'

export const teamsService = {
  async list() {
    return api.getList<Team>('/teams/')
  },

  async get(id: number) {
    return api.get<Team>(`/teams/${id}/`)
  },

  async create(data: TeamCreateRequest) {
    return api.post<Team>('/teams/', data)
  },

  async update(id: number, data: TeamUpdateRequest) {
    return api.patch<Team>(`/teams/${id}/`, data)
  },

  async delete(id: number) {
    return api.delete(`/teams/${id}/`)
  },

  async addMember(teamId: number, userId: number) {
    return api.post(`/teams/${teamId}/members/${userId}/add/`)
  },

  async removeMember(teamId: number, userId: number) {
    return api.post(`/teams/${teamId}/members/${userId}/remove/`)
  }
}
