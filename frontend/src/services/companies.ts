import { api } from '@/utils/api';
import type { Company, PlatformAuditLog } from '@/domain/types';

export interface CreateCompanyPayload {
  name: string;
  slug: string;
  description?: string;
  website?: string;
  contact_email: string;
  contact_phone: string;
  address?: string;
  timezone?: string;
  language?: string;
}

export const companiesService = {
  async listCompanies(): Promise<Company[]> {
    return api.getList<Company>('/companies/');
  },

  async createCompany(data: CreateCompanyPayload): Promise<Company> {
    return api.post<Company>('/companies/', data);
  },

  async updateCompany(id: string | number, data: Partial<Company>): Promise<Company> {
    return api.patch<Company>(`/companies/${id}/`, data);
  },

  async getPlatformAuditLog(params?: { category?: string; company?: string | number }): Promise<PlatformAuditLog[]> {
    return api.getList<PlatformAuditLog>('/companies/admin/audit-log/', { params });
  },
};
