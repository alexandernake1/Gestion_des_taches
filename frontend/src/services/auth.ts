import { api } from '@/utils/api';
import type { CompanyOnboardingRequest, CompanyRegistrationResponse, PersonalOnboardingRequest, LoginRequest, LoginResponse, RegisterRequest, User, UserAuditLog, ChangePasswordRequest, UpdateProfileRequest } from '@/domain/types';

const AUTHENTICATION_KEY = 'is_authenticated'

function rememberAuthentication(persistent = false) {
  localStorage.removeItem(AUTHENTICATION_KEY)
  sessionStorage.removeItem(AUTHENTICATION_KEY)
  const storage = persistent ? localStorage : sessionStorage
  storage.setItem(AUTHENTICATION_KEY, 'true')
}

function forgetAuthentication() {
  localStorage.removeItem(AUTHENTICATION_KEY)
  sessionStorage.removeItem(AUTHENTICATION_KEY)
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login/', credentials);
    rememberAuthentication(Boolean(credentials.remember_me));
    return response;
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/register/', data);
    rememberAuthentication();
    return response;
  },

  async completeCompanyOnboarding(data: CompanyOnboardingRequest): Promise<CompanyRegistrationResponse> {
    return api.post<CompanyRegistrationResponse>('/auth/onboarding/company/', data);
  },

  async completePersonalOnboarding(data: PersonalOnboardingRequest): Promise<CompanyRegistrationResponse> {
    return api.post<CompanyRegistrationResponse>('/auth/onboarding/personal/', data);
  },

  async loginWithGoogle(credential: string, captcha_token?: string, remember_me = false, accept_terms = false): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/google/', { credential, captcha_token, remember_me, accept_terms });
    rememberAuthentication(remember_me);
    return response;
  },

  async requestPasswordReset(email: string, captcha_token?: string): Promise<{ detail: string }> {
    return api.post('/auth/password-reset/', { email, captcha_token });
  },

  async confirmPasswordReset(data: { uid: string; token: string; new_password: string; new_password_confirm: string }): Promise<{ detail: string }> {
    return api.post('/auth/password-reset/confirm/', data);
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
    forgetAuthentication();
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
    return localStorage.getItem(AUTHENTICATION_KEY) === 'true'
      || sessionStorage.getItem(AUTHENTICATION_KEY) === 'true';
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
