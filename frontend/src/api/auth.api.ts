import { apiClient } from './client';
import type { LoginCredentials, LoginResponse, CurrentUserResponse } from '../types/auth';

export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const payload = {
      identifier: credentials.identifier.trim(),
      password: credentials.password,
    };
    const response = await apiClient<LoginResponse | { data: LoginResponse }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });

    if ('data' in response && response.data && 'access_token' in response.data) {
      return response.data as LoginResponse;
    }
    return response as LoginResponse;
  },

  async getMe(): Promise<CurrentUserResponse> {
    const response = await apiClient<CurrentUserResponse | { data: CurrentUserResponse }>('/auth/me', {
      method: 'GET',
    });

    if ('data' in response && response.data && 'user' in response.data) {
      return response.data as CurrentUserResponse;
    }
    return response as CurrentUserResponse;
  },

  async logout(refreshToken?: string | null): Promise<void> {
    try {
      await apiClient('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refreshToken || null }),
      });
    } catch {
      // Best-effort logout on backend
    }
  },
};
