import { api } from '@/utils/api';
import type { CompanySubscription, PaymentTransaction, SubscriptionPlan } from '@/domain/types';

export const subscriptionsService = {
  async getMySubscription(): Promise<CompanySubscription> {
    return api.get<CompanySubscription>('/companies/subscription/');
  },

  async listPlans(): Promise<SubscriptionPlan[]> {
    return api.getList<SubscriptionPlan>('/companies/plans/');
  },

  async adminListPlans(): Promise<SubscriptionPlan[]> {
    return api.getList<SubscriptionPlan>('/companies/admin/plans/');
  },

  async changePlan(planCode: string): Promise<CompanySubscription> {
    return api.post<CompanySubscription>('/companies/subscription/change-plan/', {
      plan_code: planCode,
    });
  },

  async adminListSubscriptions(): Promise<CompanySubscription[]> {
    return api.getList<CompanySubscription>('/companies/admin/subscriptions/');
  },

  async adminCreatePlan(data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    return api.post<SubscriptionPlan>('/companies/admin/plans/', data);
  },

  async adminUpdatePlan(id: string | number, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    return api.patch<SubscriptionPlan>(`/companies/admin/plans/${id}/`, data);
  },

  async adminDeletePlan(id: string | number): Promise<void> {
    return api.delete(`/companies/admin/plans/${id}/`);
  },

  async adminUpdateSubscription(id: string | number, data: Partial<CompanySubscription>): Promise<CompanySubscription> {
    return api.patch<CompanySubscription>(`/companies/admin/subscriptions/${id}/`, data);
  },

  async paymentHistory(): Promise<PaymentTransaction[]> {
    return api.getList<PaymentTransaction>('/companies/subscription/payments/');
  },

  async startTestPayment(planCode: string): Promise<PaymentTransaction> {
    return api.post<PaymentTransaction>('/companies/subscription/payments/start/', {
      plan_code: planCode,
    });
  },

  async simulatePayment(reference: string, outcome: PaymentTransaction['status'] | 'pending'): Promise<PaymentTransaction> {
    return api.post<PaymentTransaction>(
      `/companies/subscription/payments/${reference}/simulate/`,
      { outcome },
    );
  },
};
