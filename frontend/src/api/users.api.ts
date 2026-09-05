import { apiClient } from './client';
import type { User, UserFilters, CreateUserPayload, UpdateUserPayload, UserStatus } from '../types/users';

export const usersApi = {
  async listUsers(filters?: UserFilters): Promise<User[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.role_id) params.append('role_id', String(filters.role_id));
    if (filters?.employee_id) params.append('employee_id', String(filters.employee_id));
    if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);
    if (filters?.order) params.append('order', filters.order);

    const queryString = params.toString();
    const endpoint = `/users${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient<User[] | { data: User[] }>(endpoint, {
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

  async getUserById(id: number): Promise<User> {
    const response = await apiClient<User | { data: User }>(`/users/${id}`, {
      method: 'GET',
    });

    if ('data' in response && response.data) {
      return response.data as User;
    }
    return response as User;
  },

  async createUser(payload: CreateUserPayload): Promise<User> {
    const response = await apiClient<{ data: { user: User } | User } | User>('/auth/invitations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if ('data' in response && response.data) {
      const d = response.data;
      if ('user' in d && d.user) return d.user;
      return d as User;
    }
    return response as User;
  },

  async resendInvitation(id: number): Promise<{ message?: string }> {
    return apiClient<{ message?: string }>(`/auth/invitations/${id}/resend`, {
      method: 'POST',
    });
  },

  async updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
    if (payload.role_name) {
      try {
        await apiClient(`/users/${id}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role_name: payload.role_name }),
        });
      } catch {
        // ignore
      }
    }

    if (payload.employee_id !== undefined) {
      try {
        await apiClient(`/users/${id}/link-employee`, {
          method: 'PATCH',
          body: JSON.stringify({ employee_id: payload.employee_id }),
        });
      } catch {
        // ignore
      }
    }

    try {
      return await this.getUserById(id);
    } catch {
      return { user_id: id } as User;
    }
  },

  async setUserStatus(id: number, status: UserStatus): Promise<User> {
    const actionEndpoint = status === 'ACTIVE' ? `/users/${id}/enable` : `/users/${id}/disable`;
    try {
      const response = await apiClient<User | { data: User }>(actionEndpoint, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if ('data' in response && response.data) return response.data as User;
      return response as User;
    } catch {
      // Fallback to /users/:id/status
      const response = await apiClient<User | { data: User }>(`/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if ('data' in response && response.data) return response.data as User;
      return response as User;
    }
  },

  async deleteUser(id: number): Promise<{ success: boolean; message?: string }> {
    try {
      await this.setUserStatus(id, 'DISABLED');
      return { success: true, message: 'User deactivated successfully' };
    } catch {
      return apiClient<{ success: boolean; message?: string }>(`/users/${id}`, {
        method: 'DELETE',
      });
    }
  },
};
