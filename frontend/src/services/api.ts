import { ApiResponse } from '../types/api.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
const TOKEN_KEY = 'm63_access_token';
const REFRESH_TOKEN_KEY = 'm63_refresh_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function setStoredTokens(accessToken: string | null, refreshToken?: string | null): void {
  if (accessToken) {
    localStorage.setItem(TOKEN_KEY, accessToken);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else if (!accessToken) {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

let isRefreshing = false;
let refreshSubscribers: ((newToken: string) => void)[] = [];

function onRefreshed(newToken: string) {
  refreshSubscribers.map((cb) => cb(newToken));
  refreshSubscribers = [];
}

/**
 * Transparent API Request with Automatic Silent Token Refresh
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: { code: 'NETWORK_ERROR', message: 'Unable to communicate with M63 backend service.' },
  }));

  // Handle Token Expiration (401 / SESSION_EXPIRED) with Silent Refresh
  if (
    (!response.ok || !json.success) &&
    (response.status === 401 || json.error?.code === 'SESSION_EXPIRED') &&
    !isRetry &&
    endpoint !== '/auth/refresh' &&
    endpoint !== '/auth/login'
  ) {
    const refreshToken = getStoredRefreshToken();

    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          const refreshJson: ApiResponse<{ accessToken: string; refreshToken: string }> = await refreshRes.json();

          if (refreshRes.ok && refreshJson.success && refreshJson.data?.accessToken) {
            const newAccess = refreshJson.data.accessToken;
            const newRefresh = refreshJson.data.refreshToken || refreshToken;

            setStoredTokens(newAccess, newRefresh);
            isRefreshing = false;
            onRefreshed(newAccess);

            // Retry original request with new access token
            return await apiRequest<T>(endpoint, options, true);
          } else {
            // Refresh failed — token invalid or revoked
            setStoredTokens(null, null);
            isRefreshing = false;
          }
        } catch (e) {
          setStoredTokens(null, null);
          isRefreshing = false;
        }
      } else {
        // Wait for active token refresh to complete then retry
        return new Promise<T>((resolve, reject) => {
          refreshSubscribers.push((newToken: string) => {
            options.headers = {
              ...(options.headers as Record<string, string>),
              Authorization: `Bearer ${newToken}`,
            };
            apiRequest<T>(endpoint, options, true).then(resolve).catch(reject);
          });
        });
      }
    }
  }

  if (!response.ok || !json.success) {
    const error: any = new Error(json.error?.message || 'An error occurred during request.');
    error.code = json.error?.code || 'UNKNOWN_ERROR';
    error.status = response.status;
    throw error;
  }

  return json.data as T;
}
