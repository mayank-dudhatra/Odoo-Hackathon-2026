import { apiClient } from './client';
import type { Position, CreatePositionPayload } from '../types/organization';

async function requestWithOrgFallback<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T }> {
  try {
    return await apiClient<{ data: T }>(`/org${path}`, options);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404) {
      return await apiClient<{ data: T }>(path, options);
    }
    throw err;
  }
}

export const positionsApi = {
  async getPositions(): Promise<Position[]> {
    const res = await requestWithOrgFallback<Position[]>('/positions');
    if (Array.isArray(res)) return res as Position[];
    return res.data || [];
  },

  async getPosition(id: number | string): Promise<Position> {
    const res = await requestWithOrgFallback<Position>(`/positions/${id}`);
    if (res && 'data' in res && res.data) return res.data;
    return res as unknown as Position;
  },

  async createPosition(payload: CreatePositionPayload): Promise<Position> {
    const res = await requestWithOrgFallback<Position>('/positions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as unknown as Position;
  },

  async updatePosition(
    id: number | string,
    payload: Partial<CreatePositionPayload>
  ): Promise<Position> {
    try {
      const res = await requestWithOrgFallback<Position>(`/positions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (res && 'data' in res && res.data) return res.data;
      return res as unknown as Position;
    } catch {
      const res = await requestWithOrgFallback<Position>(`/positions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res && 'data' in res && res.data) return res.data;
      return res as unknown as Position;
    }
  },

  async deletePosition(id: number | string): Promise<void> {
    try {
      await requestWithOrgFallback<void>(`/positions/${id}/deactivate`, {
        method: 'PATCH',
      });
    } catch {
      await requestWithOrgFallback<void>(`/positions/${id}`, {
        method: 'DELETE',
      });
    }
  },
};
