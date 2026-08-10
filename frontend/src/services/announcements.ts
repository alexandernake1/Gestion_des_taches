import { api } from '@/utils/api';
import type { SystemAnnouncement } from '@/domain/types';

export const announcementsService = {
  async getActiveAnnouncements(): Promise<SystemAnnouncement[]> {
    return api.getList<SystemAnnouncement>('/companies/announcements/active/');
  },

  async listAnnouncements(): Promise<SystemAnnouncement[]> {
    return api.getList<SystemAnnouncement>('/companies/admin/announcements/');
  },

  async createAnnouncement(data: Partial<SystemAnnouncement>): Promise<SystemAnnouncement> {
    return api.post<SystemAnnouncement>('/companies/admin/announcements/', data);
  },

  async updateAnnouncement(id: string | number, data: Partial<SystemAnnouncement>): Promise<SystemAnnouncement> {
    return api.patch<SystemAnnouncement>(`/companies/admin/announcements/${id}/`, data);
  },

  async deleteAnnouncement(id: string | number): Promise<void> {
    return api.delete(`/companies/admin/announcements/${id}/`);
  },
};
