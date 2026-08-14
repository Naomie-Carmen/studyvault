import { ApiResponse } from '../types/api';

const isTauri = typeof window !== 'undefined' && (
  '__TAURI__' in window ||
  '__TAURI_IPC__' in window ||
  '__TAURI_METADATA__' in window ||
  window.location.protocol.startsWith('tauri') ||
  window.location.protocol.startsWith('asset')
);

const defaultBaseUrl = isTauri ? 'http://localhost:5000/api/v1' : '/api/v1';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultBaseUrl;

let currentAccessToken: string | null = null;
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

export function setClientAccessToken(token: string | null): void {
  currentAccessToken = token;
}

export function getClientAccessToken(): string | null {
  return currentAccessToken;
}

function handleRefreshFailure(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('studyvault_access_token');
      localStorage.removeItem('studyvault_refresh_token');
    } catch (_err) {
      // Storage errors ignored
    }
    window.dispatchEvent(new CustomEvent('studyvault:unauthorized'));
  }
  setClientAccessToken(null);
}

async function performTokenRefresh(): Promise<string | null> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('studyvault_refresh_token') : null;
  if (!refreshToken) {
    handleRefreshFailure();
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    });

    const data = await response.json();
    if (response.ok && data.success && data.data?.accessToken) {
      const newAccessToken: string = data.data.accessToken;
      const newRefreshToken: string | undefined = data.data.refreshToken;
      if (typeof window !== 'undefined') {
        localStorage.setItem('studyvault_access_token', newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem('studyvault_refresh_token', newRefreshToken);
        }
      }
      setClientAccessToken(newAccessToken);
      return newAccessToken;
    } else {
      handleRefreshFailure();
      return null;
    }
  } catch (_err) {
    handleRefreshFailure();
    return null;
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit & { _isRetry?: boolean } = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(currentAccessToken ? { Authorization: `Bearer ${currentAccessToken}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Ensures HTTP-only cookies are included for CORS
    });

    const isAuthEndpoint =
      endpoint.startsWith('/auth/login') ||
      endpoint.startsWith('/auth/register') ||
      endpoint.startsWith('/auth/refresh') ||
      endpoint.startsWith('/auth/logout');

    if (response.status === 401 && !isAuthEndpoint && !options._isRetry) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = performTokenRefresh().finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        const retryHeaders: HeadersInit = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...(options.headers || {}),
        };
        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders,
          credentials: 'include',
        });
        return (await parseJson(retryResponse)) as ApiResponse<T>;
      }
    }

    const data = (await parseJson(response)) as ApiResponse<T>;
    return data;
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Impossible de contacter l\'API backend.',
        statusCode: 503,
      },
    };
  }
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return { success: true, data: null };
  try {
    return JSON.parse(text);
  } catch (_err) {
    return {
      success: false,
      error: {
        code: 'INVALID_RESPONSE',
        message: `Réponse inattendue du serveur (${response.status}).`,
        statusCode: response.status,
      },
    };
  }
}
