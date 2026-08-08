import { api } from '@/utils/api'
import type { Status, Task, TaskCreateRequest, TaskUpdateRequest, TaskHistory, TaskComment, TaskCommentCreateRequest, TaskAttachment, TaskReport, TaskReportCreateRequest, TaskTemplate } from '@/domain/types'

export const tasksService = {
  async list(params?: { status?: string; priority?: string; assigned_to?: number; team?: number; parent?: number; search?: string; scope?: 'team' | 'all' }) {
    return api.getList<Task>('/tasks/', { params })
  },

  async get(id: number) {
    return api.get<Task>(`/tasks/${id}/`)
  },

  async create(data: TaskCreateRequest) {
    return api.post<Task>('/tasks/', data)
  },

  async update(id: number, data: TaskUpdateRequest) {
    return api.patch<Task>(`/tasks/${id}/`, data)
  },

  async delete(id: number) {
    return api.delete(`/tasks/${id}/`)
  },

  async duplicate(id: number) {
    return api.post<Task>(`/tasks/${id}/duplicate/`)
  },

  async restore(id: number) {
    return api.post<Task>(`/tasks/${id}/restore/`)
  },

  async bulkAction(data: { task_ids: number[]; action: 'status' | 'archive' | 'restore' | 'assign'; status?: Status; assigned_to?: number | null }) {
    return api.post<Task[]>('/tasks/bulk/', data)
  },

  async getWorkload(week?: string) {
    return api.get<{
      week_start: string
      week_end: string
      members: Array<{
        id: number
        name: string
        role: string
        capacity_hours: number
        scheduled_hours: number
        remaining_hours: number
        utilization_percent: number
        overdue_tasks: number
        is_overloaded: boolean
      }>
      unassigned_tasks: Array<Pick<Task, 'id' | 'title' | 'priority' | 'due_date' | 'estimated_hours'>>
      total_capacity_hours: number
      total_scheduled_hours: number
    }>('/tasks/workload/', { params: { week } })
  },

  async listTemplates() {
    return api.getList<TaskTemplate>('/tasks/templates/')
  },

  async createTemplate(data: Pick<TaskTemplate, 'name' | 'title' | 'description' | 'priority' | 'default_duration_days'>) {
    return api.post<TaskTemplate>('/tasks/templates/', data)
  },

  async saveAsTemplate(taskId: number, name: string) {
    return api.post<TaskTemplate>(`/tasks/${taskId}/save-template/`, { name })
  },

  async instantiateTemplate(templateId: number, data?: { assigned_to?: number; team?: number; start_date?: string }) {
    return api.post<Task>(`/tasks/templates/${templateId}/instantiate/`, data || {})
  },

  async getMyTasks(params?: { status?: string; priority?: string; search?: string }) {
    return api.get<Task[]>('/tasks/my/', { params })
  },

  async getAssignedTasks(params?: { status?: string; priority?: string; search?: string }) {
    return api.get<Task[]>('/tasks/assigned/', { params })
  },

  async getHistory(taskId: number) {
    return api.getList<TaskHistory>(`/tasks/${taskId}/history/`)
  },

  // Comments
  async getComments(taskId: number) {
    return api.getList<TaskComment>(`/tasks/${taskId}/comments/`)
  },

  async createComment(taskId: number, data: TaskCommentCreateRequest) {
    return api.post<TaskComment>(`/tasks/${taskId}/comments/`, data)
  },

  async updateComment(taskId: number, commentId: number, data: { content: string }) {
    return api.patch<TaskComment>(`/tasks/${taskId}/comments/${commentId}/`, data)
  },

  async deleteComment(taskId: number, commentId: number) {
    return api.delete(`/tasks/${taskId}/comments/${commentId}/`)
  },

  // Attachments
  async getAttachments(taskId: number) {
    return api.getList<TaskAttachment>(`/tasks/${taskId}/attachments/`)
  },

  async uploadAttachment(taskId: number, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<TaskAttachment>(`/tasks/${taskId}/attachments/`, formData)
  },

  async deleteAttachment(taskId: number, attachmentId: number) {
    return api.delete(`/tasks/${taskId}/attachments/${attachmentId}/`)
  },

  async downloadAttachment(taskId: number, attachmentId: number) {
    return api.download(`/tasks/${taskId}/attachments/${attachmentId}/download/`)
  },

  // Reports
  async getReports(taskId: number) {
    return api.getList<TaskReport>(`/tasks/${taskId}/reports/`)
  },

  async createReport(taskId: number, data: TaskReportCreateRequest) {
    return api.post<TaskReport>(`/tasks/${taskId}/reports/`, data)
  },

  async reviewReport(taskId: number, reportId: number, data: { status: 'approved' | 'rejected'; review_comment?: string }) {
    return api.patch<TaskReport>(`/tasks/${taskId}/reports/${reportId}/`, data)
  },

  async getMyReports(params?: { status?: string }) {
    return api.get<TaskReport[]>('/tasks/reports/my/', { params })
  },

  async getPendingReports() {
    return api.get<TaskReport[]>('/tasks/reports/pending/')
  }
}
