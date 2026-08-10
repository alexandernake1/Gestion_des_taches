/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../../utils/api';
import { tasksService } from '../tasks';

vi.mock('../../utils/api');

describe('Task Service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('list', () => {
    it('should fetch tasks with params', async () => {
      const mockData = { results: [] };
      vi.mocked(api.getList).mockResolvedValueOnce(mockData as any);

      const result = await tasksService.list({ status: 'todo' });

      expect(api.getList).toHaveBeenCalledWith('/tasks/', {
        params: { status: 'todo' }
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('create', () => {
    it('should create task', async () => {
      const taskData = { title: 'New Task' } as any;
      const mockResponse = { id: 1, ...taskData };
      vi.mocked(api.post).mockResolvedValueOnce(mockResponse as any);

      const result = await tasksService.create(taskData);

      expect(api.post).toHaveBeenCalledWith('/tasks/', taskData);
      expect(result).toEqual(mockResponse);
    });
  });
});
