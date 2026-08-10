import { api } from '@/utils/api';
import type { CompanyRegistrationRequest, CompanyRegistrationResponse, LoginRequest, LoginResponse, User, UserAuditLog, ChangePasswordRequest, UpdateProfileRequest } from '@/domain/types';

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login/', credentials);
    localStorage.setItem('is_authenticated', 'true');
    return response;
  },

  async register(data: CompanyRegistrationRequest): Promise<CompanyRegistrationResponse> {
    const response = await api.post<CompanyRegistrationResponse>('/auth/register/company/', data);
    localStorage.setItem('is_authenticated', 'true');
    return response;
  },

  async checkCompanyEmail(email: string): Promise<{ available: boolean; message?: string }> {
    return api.get('/auth/register/company/email-availability/', { params: { email } });
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout/', {});
    } catch {
      // Local logout must still complete if the server fails.
    }
    localStorage.removeItem('is_authenticated');
    localStorage.removeItem('impersonated_company_id');
  },

  async getCurrentUser(): Promise<User> {
    return api.get<User>('/auth/me/');
  },

  async getProfile(): Promise<User> {
    return api.get<User>('/auth/profile/');
  },

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    return api.patch<User>('/auth/profile/', data);
  },

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    return api.post<void>('/auth/change-password/', data);
  },

  isAuthenticated(): boolean {
    return localStorage.getItem('is_authenticated') === 'true';
  },

  getToken(): string | null {
    // JWT is now stored in HttpOnly cookie, so we can't return it to JS.
    return null;
  },

  async list(params?: { search?: string; role?: string; is_active?: boolean }) {
    return api.getList<User>('/auth/users/', { params })
  },

  async get(id: string | number) {
    return api.get<User>(`/auth/users/${id}/`)
  },

  async update(id: string | number, data: UpdateProfileRequest & { role?: string; is_active?: boolean; weekly_capacity_hours?: number }) {
    return api.patch<User>(`/auth/users/${id}/`, data)
  },

  async delete(id: string | number) {
    return api.delete(`/auth/users/${id}/`)
  },

  async invite(data: { email: string; first_name: string; last_name: string; phone?: string; role: string }) {
    return api.post<User & { temporary_password: string }>('/auth/users/invite/', data)
  },

  async resetPassword(id: string | number) {
    return api.post<{ email: string; temporary_password: string }>(`/auth/users/${id}/reset-password/`)
  },

  async activate(id: string | number) {
    return api.post(`/auth/users/${id}/activate/`)
  },

  async deactivate(id: string | number) {
    return api.post(`/auth/users/${id}/deactivate/`)
  },

  async getAuditLog(params?: { target?: string | number; action?: string }) {
    return api.getList<UserAuditLog>('/auth/users/audit-log/', { params })
  }
};
