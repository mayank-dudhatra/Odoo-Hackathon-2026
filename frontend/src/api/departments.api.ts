import { apiClient } from './client';
import type { Department, CreateDepartmentPayload } from '../types/organization';

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

export const departmentsApi = {
  async getDepartments(params?: { is_active?: string | boolean }): Promise<Department[]> {
    const qs = params?.is_active !== undefined ? `?is_active=${params.is_active}` : '';
    const res = await requestWithOrgFallback<Department[]>(`/departments${qs}`);
    if (Array.isArray(res)) return res as Department[];
    return res.data || [];
  },

  async getDepartment(id: number | string): Promise<Department> {
    const res = await requestWithOrgFallback<Department>(`/departments/${id}`);
    if (res && 'data' in res && res.data) return res.data;
    return res as unknown as Department;
  },

  async createDepartment(payload: CreateDepartmentPayload): Promise<Department> {
    const res = await requestWithOrgFallback<Department>('/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as unknown as Department;
  },

  async updateDepartment(
    id: number | string,
    payload: Partial<CreateDepartmentPayload>
  ): Promise<Department> {
    try {
      const res = await requestWithOrgFallback<Department>(`/departments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (res && 'data' in res && res.data) return res.data;
      return res as unknown as Department;
    } catch {
      const res = await requestWithOrgFallback<Department>(`/departments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res && 'data' in res && res.data) return res.data;
      return res as unknown as Department;
    }
  },

  async deleteDepartment(id: number | string): Promise<void> {
    try {
      await requestWithOrgFallback<void>(`/departments/${id}/deactivate`, {
        method: 'PATCH',
      });
    } catch {
      await requestWithOrgFallback<void>(`/departments/${id}`, {
        method: 'DELETE',
      });
    }
  },
};
