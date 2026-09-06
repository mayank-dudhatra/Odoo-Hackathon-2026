const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, message: string, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem('pp360_access_token');
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem('pp360_refresh_token');
}

export function setStoredTokens(accessToken: string, refreshToken?: string | null): void {
  localStorage.setItem('pp360_access_token', accessToken);
  if (refreshToken) {
    localStorage.setItem('pp360_refresh_token', refreshToken);
  }
}

export function clearStoredTokens(): void {
  localStorage.removeItem('pp360_access_token');
  localStorage.removeItem('pp360_refresh_token');
  localStorage.removeItem('pp360_user');
}

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken, refreshToken }),
    });

    if (!res.ok) {
      clearStoredTokens();
      return null;
    }

    const data = await res.json();
    const newAccessToken = data.access_token || data.data?.access_token;
    const newRefreshToken = data.refresh_token || data.data?.refresh_token;

    if (newAccessToken) {
      setStoredTokens(newAccessToken, newRefreshToken);
      return newAccessToken;
    }

    return null;
  } catch {
    clearStoredTokens();
    return null;
  }
}

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
}

const clientCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

export function clearClientCache(prefix?: string): void {
  if (!prefix) {
    clientCache.clear();
    return;
  }
  for (const key of clientCache.keys()) {
    if (key.includes(prefix)) {
      clientCache.delete(key);
    }
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  bypassCache?: boolean;
  cacheTtlMs?: number;
}

export async function apiClient<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, bypassCache = false, cacheTtlMs = 45000, headers = {}, ...restOptions } = options;
  const method = (restOptions.method || 'GET').toUpperCase();
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const cacheKey = `${method}:${url}`;

  // On non-GET mutations, invalidate affected cache tags
  if (method !== 'GET') {
    const cleanPath = endpoint.split('?')[0].replace(/^\//, '');
    const segments = cleanPath.split('/');
    const mainResource = segments[0] || '';
    clearClientCache(mainResource);
    if (segments[1]) clearClientCache(segments[1]);
    clearClientCache('dashboard');
    clearClientCache('summary');
  }

  // Check client-side cache for GET requests
  if (method === 'GET' && !bypassCache) {
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }

    // Deduplicate in-flight GET requests
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey)!;
    }
  }

  const fetchPromise = (async () => {
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    };

    if (!skipAuth) {
      const token = getStoredAccessToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    let response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
    });

    // Handle 401 and attempt refresh token exchange
    if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newToken);

        if (newToken) {
          requestHeaders['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(url, {
            ...restOptions,
            headers: requestHeaders,
          });
        } else {
          clearClientCache();
          window.dispatchEvent(new CustomEvent('pp360:unauthorized'));
        }
      } else {
        // Wait for ongoing refresh
        const retryToken = await new Promise<string | null>((resolve) => {
          subscribeTokenRefresh((token) => resolve(token));
        });

        if (retryToken) {
          requestHeaders['Authorization'] = `Bearer ${retryToken}`;
          response = await fetch(url, {
            ...restOptions,
            headers: requestHeaders,
          });
        }
      }
    }

    // Handle 403 Forbidden
    if (response.status === 403) {
      let errorData: { error?: { code?: string; message?: string } } = {};
      try {
        errorData = await response.json();
      } catch {
        // ignore
      }
      const message = errorData?.error?.message || 'Access denied. You do not have permission to perform this action.';
      const code = errorData?.error?.code || 'FORBIDDEN';

      if (code === 'MUST_CHANGE_PASSWORD') {
        window.dispatchEvent(new CustomEvent('pp360:must-change-password'));
      }

      throw new ApiError(403, message, code);
    }

    // Parse JSON response
    let data: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errObj = typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {};
      const backendError = (errObj['error'] as { message?: string; code?: string; details?: unknown }) || {};
      const message = backendError.message || (errObj['message'] as string) || `Request failed with status ${response.status}`;
      const code = backendError.code || (errObj['code'] as string) || 'UNKNOWN_ERROR';
      const details = backendError.details || errObj['details'];

      throw new ApiError(response.status, message, code, details);
    }

    // Store in client-side cache for GET requests
    if (method === 'GET' && !bypassCache) {
      clientCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + cacheTtlMs,
      });
    }

    return data as T;
  })();

  if (method === 'GET' && !bypassCache) {
    inFlightRequests.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => {
      inFlightRequests.delete(cacheKey);
    });
  }

  return fetchPromise;
}
