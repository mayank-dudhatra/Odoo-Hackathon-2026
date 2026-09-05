import { createContext } from 'react';
import type { User, LoginCredentials, RolePermission } from '../types/auth';

export interface AuthContextType {
  user: User | null;
  role: string | null;
  permissions: RolePermission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkPermission: (module: string, action: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
