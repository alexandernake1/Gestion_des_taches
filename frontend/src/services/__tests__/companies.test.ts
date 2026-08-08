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
      const mockData = { results: [{ id: 1, name: 'Company A' }] };
      vi.mocked(api.getList).mockResolvedValueOnce(mockData as any);

      const result = await companiesService.listCompanies();

      expect(api.getList).toHaveBeenCalledWith('/companies/');
      expect(result).toEqual(mockData);
    });
  });
});
