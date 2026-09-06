import { createContext } from 'react';
import type { User, EmployeeInfo, LoginCredentials, RolePermission } from '../types/auth';

export interface AuthContextType {
  user: User | null;
  employee: EmployeeInfo | null;
  role: string | null;
  permissions: RolePermission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkPermission: (module: string, action: string) => boolean;
  changePassword: (data: {
    current_password: string;
    new_password: string;
    confirm_password?: string;
  }) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
