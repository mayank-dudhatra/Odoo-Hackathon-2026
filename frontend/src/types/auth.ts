import type { RolePermission } from './rbac';
export type { RolePermission };

export type UserStatus = 'ACTIVE' | 'INVITED' | 'DISABLED';

export interface User {
  user_id: number;
  company_id: number;
  employee_id: number | null;
  username: string;
  email: string;
  role_id: number;
  role_name: string;
  status: UserStatus;
  invitation_expires_at?: string | null;
  email_verified_at?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
  // Optional employee details when populated
  first_name?: string | null;
  last_name?: string | null;
  employee_code?: string | null;
}

export interface LoginCredentials {
  identifier: string; // email or username
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  refresh_expires_at?: string;
  user: User;
  permissions?: RolePermission[];
}

export interface CurrentUserResponse {
  user: User;
  permissions: RolePermission[];
}

export interface AuthState {
  user: User | null;
  role: string | null;
  permissions: RolePermission[];
  isAuthenticated: boolean;
  isLoading: boolean;
}
