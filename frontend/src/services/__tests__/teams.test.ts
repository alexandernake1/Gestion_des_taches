/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../utils/api';
import { teamsService } from '../teams';

vi.mock('../../utils/api');

describe('Team Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('list', () => {
    it('should fetch teams', async () => {
      const mockData = { results: [{ id: 1, name: 'Team A' }] };
      vi.mocked(api.getList).mockResolvedValueOnce(mockData as any);

      const result = await teamsService.list();

      expect(api.getList).toHaveBeenCalledWith('/teams/');
      expect(result).toEqual(mockData);
    });
  });
});
