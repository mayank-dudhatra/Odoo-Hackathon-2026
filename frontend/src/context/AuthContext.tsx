import React, { useState, useEffect, useCallback } from 'react';
import type { User, LoginCredentials, RolePermission } from '../types/auth';
import { authApi } from '../api/auth.api';
import { rolesApi } from '../api/roles.api';
import {
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredTokens,
  clearStoredTokens,
} from '../api/client';
import { AuthContext } from './authContextDef';

const USER_STORAGE_KEY = 'pp360_user';
const PERMISSIONS_STORAGE_KEY = 'pp360_permissions';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (savedUser) {
      try {
        return JSON.parse(savedUser) as User;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [employee, setEmployee] = useState<EmployeeInfo | null>(() => {
    const savedEmp = localStorage.getItem('pp360_employee');
    if (savedEmp) {
      try {
        return JSON.parse(savedEmp) as EmployeeInfo;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [permissions, setPermissions] = useState<RolePermission[]>(() => {
    const saved = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved) as RolePermission[];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    const token = getStoredAccessToken();
    return !(savedUser && token);
  });

  const role = user?.role_name || null;
  const isAuthenticated = Boolean(user && getStoredAccessToken());

  const fetchRolePermissions = useCallback(async (roleId: number): Promise<RolePermission[]> => {
    try {
      const perms = await rolesApi.getRolePermissions(roleId);
      return perms;
    } catch {
      return [];
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const meResponse = await authApi.getMe();
      if (meResponse && meResponse.user) {
        setUser(meResponse.user);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(meResponse.user));

        if (meResponse.employee) {
          setEmployee(meResponse.employee);
          localStorage.setItem('pp360_employee', JSON.stringify(meResponse.employee));
        } else {
          setEmployee(null);
          localStorage.removeItem('pp360_employee');
        }

        let perms = meResponse.permissions || [];
        if ((!perms || perms.length === 0) && meResponse.user.role_id) {
          perms = await fetchRolePermissions(meResponse.user.role_id);
        }

        setPermissions(perms);
        localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(perms));
      }
    } catch {
      if (!getStoredAccessToken()) {
        setUser(null);
        setEmployee(null);
        setPermissions([]);
        clearStoredTokens();
      }
    }
  }, [fetchRolePermissions]);

  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredAccessToken();
      if (!token) {
        setUser(null);
        setEmployee(null);
        setPermissions([]);
        setIsLoading(false);
        return;
      }

      try {
        await refreshUser();
      } catch {
        clearStoredTokens();
        setUser(null);
        setEmployee(null);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const handleUnauthorized = () => {
      clearStoredTokens();
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem('pp360_employee');
      localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
      setUser(null);
      setEmployee(null);
      setPermissions([]);
    };

    const handleMustChangePassword = () => {
      setUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, must_change_password: true };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    };

    window.addEventListener('pp360:unauthorized', handleUnauthorized);
    window.addEventListener('pp360:must-change-password', handleMustChangePassword);
    return () => {
      window.removeEventListener('pp360:unauthorized', handleUnauthorized);
      window.removeEventListener('pp360:must-change-password', handleMustChangePassword);
    };
  }, [refreshUser]);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    clearStoredTokens();
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem('pp360_employee');
    localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
    setUser(null);
    setEmployee(null);
    setPermissions([]);

    setIsLoading(true);
    try {
      const response = await authApi.login(credentials);
      const { access_token, refresh_token, user: loggedInUser, employee: loggedInEmployee } = response;

      setStoredTokens(access_token, refresh_token);
      setUser(loggedInUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));

      if (loggedInEmployee) {
        setEmployee(loggedInEmployee);
        localStorage.setItem('pp360_employee', JSON.stringify(loggedInEmployee));
      } else {
        setEmployee(null);
      }

      let perms = response.permissions || [];
      if ((!perms || perms.length === 0) && loggedInUser.role_id) {
        perms = await fetchRolePermissions(loggedInUser.role_id);
      }

      setPermissions(perms);
      localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(perms));
      return loggedInUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    const refreshToken = getStoredRefreshToken();
    try {
      await authApi.logout(refreshToken);
    } finally {
      clearStoredTokens();
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem('pp360_employee');
      localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
      setUser(null);
      setEmployee(null);
      setPermissions([]);
    }
  };

  const changePassword = async (data: {
    current_password: string;
    new_password: string;
    confirm_password?: string;
  }): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await authApi.changePassword(data);
      if (response?.access_token) {
        setStoredTokens(response.access_token);
      }

      setUser((prev) => {
        const updated = response?.user
          ? { ...response.user, must_change_password: false }
          : prev
          ? { ...prev, must_change_password: false }
          : null;
        if (updated) {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkPermission = (module: string, action: string): boolean => {
    if (user?.role_name === 'Admin') {
      return true;
    }
    const normalizedModule = module.toUpperCase();
    const normalizedAction = action.toUpperCase();

    return permissions.some(
      (p) => p.module.toUpperCase() === normalizedModule && p.action.toUpperCase() === normalizedAction
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        role,
        permissions,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshUser,
        checkPermission,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

