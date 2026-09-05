import { apiClient } from './client';
import type { EmployeeType, CreateEmployeeTypePayload } from '../types/organization';

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

export const employeeTypesApi = {
  async getEmployeeTypes(): Promise<EmployeeType[]> {
    const res = await requestWithOrgFallback<EmployeeType[]>('/employee-types');
    if (Array.isArray(res)) return res as EmployeeType[];
    return res.data || [];
  },

  async getEmployeeType(id: number | string): Promise<EmployeeType> {
    const res = await requestWithOrgFallback<EmployeeType>(`/employee-types/${id}`);
    if (res && 'data' in res && res.data) return res.data;
    return res as unknown as EmployeeType;
  },

  async createEmployeeType(payload: CreateEmployeeTypePayload): Promise<EmployeeType> {
    const res = await requestWithOrgFallback<EmployeeType>('/employee-types', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res && 'data' in res && res.data) return res.data;
    return res as unknown as EmployeeType;
  },

  async updateEmployeeType(
    id: number | string,
    payload: Partial<CreateEmployeeTypePayload>
  ): Promise<EmployeeType> {
    try {
      const res = await requestWithOrgFallback<EmployeeType>(`/employee-types/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (res && 'data' in res && res.data) return res.data;
      return res as unknown as EmployeeType;
    } catch {
      const res = await requestWithOrgFallback<EmployeeType>(`/employee-types/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res && 'data' in res && res.data) return res.data;
      return res as unknown as EmployeeType;
    }
  },

  async setEmployeeTypeStatus(id: number | string, isActive: boolean): Promise<void> {
    try {
      await requestWithOrgFallback<void>(`/employee-types/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive }),
      });
    } catch {
      await requestWithOrgFallback<void>(`/employee-types/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: isActive }),
      });
    }
  },

  async deleteEmployeeType(id: number | string): Promise<void> {
    try {
      await requestWithOrgFallback<void>(`/employee-types/${id}`, {
        method: 'DELETE',
      });
    } catch {
      await this.setEmployeeTypeStatus(id, false);
    }
  },
};
