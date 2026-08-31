/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../utils/api';
import { companiesService } from '../companies';

vi.mock('../../utils/api');

describe('Company Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('listCompanies', () => {
    it('should fetch companies', async () => {
      const mockData = [{ id: 1, name: 'Company A' }];
      vi.mocked(api.getList).mockResolvedValueOnce(mockData as any);

      const result = await companiesService.listCompanies();

      expect(api.getList).toHaveBeenCalledWith('/companies/');
      expect(result).toEqual(mockData);
    });
  });

  describe('deleteCompany', () => {
    it('should call api.delete with company id', async () => {
      vi.mocked(api.delete).mockResolvedValueOnce(undefined as any);

      await companiesService.deleteCompany(42);

      expect(api.delete).toHaveBeenCalledWith('/companies/42/');
    });
  });
});
