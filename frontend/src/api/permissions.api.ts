import { apiClient } from './client';
import type { Permission } from '../types/rbac';

export const permissionsApi = {
  async listPermissions(): Promise<Permission[]> {
    const response = await apiClient<Permission[] | { data: Permission[] }>('/permissions', {
      method: 'GET',
    });

    if (Array.isArray(response)) {
      return response;
    }
    if (response && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  },
};
