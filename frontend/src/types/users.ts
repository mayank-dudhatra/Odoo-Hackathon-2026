import type { User, UserStatus } from './auth';

export type { User, UserStatus };

export interface UserFilters {
  search?: string;
  role_id?: number | string;
  employee_id?: number | string;
  status?: UserStatus | 'ALL';
  is_active?: boolean;
  page?: number;
  limit?: number;
  sort_by?: string;
  order?: 'asc' | 'desc';
}

export interface CreateUserPayload {
  username: string;
  email: string;
  role_name: string;
  employee_id?: number | null;
}

export interface UpdateUserPayload {
  role_name?: string;
  employee_id?: number | null;
  status?: UserStatus;
}
