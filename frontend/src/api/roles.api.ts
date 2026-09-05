import { apiClient } from './client';
import type { Role, RolePermission, CreateRolePayload, UpdateRolePayload, UpdateRolePermissionsPayload } from '../types/rbac';

export const rolesApi = {
  async listRoles(): Promise<Role[]> {
    const response = await apiClient<Role[] | { data: Role[] }>('/roles', {
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

  async createRole(payload: CreateRolePayload): Promise<Role> {
    const response = await apiClient<Role | { data: Role }>('/roles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if ('data' in response && response.data) {
      return response.data as Role;
    }
    return response as Role;
  },

  async updateRole(id: number, payload: UpdateRolePayload): Promise<Role> {
    const response = await apiClient<Role | { data: Role }>(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if ('data' in response && response.data) {
      return response.data as Role;
    }
    return response as Role;
  },

  async deleteRole(id: number): Promise<{ success: boolean; message?: string }> {
    return apiClient<{ success: boolean; message?: string }>(`/roles/${id}`, {
      method: 'DELETE',
    });
  },

  async getRolePermissions(id: number): Promise<RolePermission[]> {
    const response = await apiClient<RolePermission[] | { data: RolePermission[] }>(`/roles/${id}/permissions`, {
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

  async updateRolePermissions(id: number, permissions: UpdateRolePermissionsPayload['permissions']): Promise<RolePermission[]> {
    const response = await apiClient<RolePermission[] | { data: RolePermission[] }>(`/roles/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
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
