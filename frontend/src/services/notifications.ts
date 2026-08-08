import { api } from '@/utils/api'
import type { Notification, NotificationPreference } from '@/domain/types'

export const notificationsService = {
  async list() {
    return api.getList<Notification>('/notifications/')
  },

  async get(id: number) {
    return api.get<Notification>(`/notifications/${id}/`)
  },

  async markAsRead(id: number) {
    return api.patch<Notification>(`/notifications/${id}/`, { is_read: true })
  },

  async markAllRead() {
    return api.post('/notifications/mark-all-read/', {})
  },

  async getUnreadCount() {
    return api.get<{ count: number }>('/notifications/unread-count/')
  },

  async getPreferences() {
    return api.get<NotificationPreference>('/notifications/preferences/')
  },

  async updatePreferences(data: Partial<NotificationPreference>) {
    return api.patch<NotificationPreference>('/notifications/preferences/', data)
  }
}
