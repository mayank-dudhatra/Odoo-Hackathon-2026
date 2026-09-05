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

  const [isLoading, setIsLoading] = useState<boolean>(true);

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

        let perms = meResponse.permissions || [];
        if ((!perms || perms.length === 0) && meResponse.user.role_id) {
          perms = await fetchRolePermissions(meResponse.user.role_id);
        }

        setPermissions(perms);
        localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(perms));
      }
    } catch {
      // If getMe fails on refresh and tokens are invalid, clear
      if (!getStoredAccessToken()) {
        setUser(null);
        setPermissions([]);
        clearStoredTokens();
      }
    }
  }, [fetchRolePermissions]);

  // Initial load to rehydrate and verify authentication
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredAccessToken();
      if (!token) {
        setUser(null);
        setPermissions([]);
        setIsLoading(false);
        return;
      }

      try {
        await refreshUser();
      } catch {
        // Token might be expired or invalid
        clearStoredTokens();
        setUser(null);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const handleUnauthorized = () => {
      clearStoredTokens();
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
      setUser(null);
      setPermissions([]);
    };

    window.addEventListener('pp360:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('pp360:unauthorized', handleUnauthorized);
    };
  }, [refreshUser]);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    // Clear any previous session state before storing new user session
    clearStoredTokens();
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
    setUser(null);
    setPermissions([]);

    setIsLoading(true);
    try {
      const response = await authApi.login(credentials);
      const { access_token, refresh_token, user: loggedInUser } = response;

      setStoredTokens(access_token, refresh_token);
      setUser(loggedInUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedInUser));

      // Resolve permissions
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
      localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
      setUser(null);
      setPermissions([]);
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
        role,
        permissions,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshUser,
        checkPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

