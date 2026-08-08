/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../utils/api';
import { dashboardService } from '../dashboard';

vi.mock('../../utils/api');

describe('Dashboard Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getUserStatistics', () => {
    it('should fetch user statistics', async () => {
      const mockData = { total_tasks: 5 };
      vi.mocked(api.get).mockResolvedValueOnce(mockData as any);

      const result = await dashboardService.getUserStatistics();

      expect(api.get).toHaveBeenCalledWith('/dashboard/user/');
      expect(result).toEqual(mockData);
    });
  });

  describe('getCompanyStatistics', () => {
    it('should fetch company statistics', async () => {
      const mockData = { total_tasks: 10 };
      vi.mocked(api.get).mockResolvedValueOnce(mockData as any);

      const result = await dashboardService.getCompanyStatistics();

      expect(api.get).toHaveBeenCalledWith('/dashboard/company/');
      expect(result).toEqual(mockData);
    });
  });

  describe('getRecentActivity', () => {
    it('should fetch recent activity with default limit', async () => {
      const mockData = [{ id: 1, action: 'created' }];
      vi.mocked(api.get).mockResolvedValueOnce(mockData as any);

      const result = await dashboardService.getRecentActivity();

      expect(api.get).toHaveBeenCalledWith('/dashboard/activity/', { params: { limit: 10 } });
      expect(result).toEqual(mockData);
    });
  });
});
