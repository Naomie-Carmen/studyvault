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

export function setClientAccessToken(token: string | null): void {
  currentAccessToken = token;
}

export function getClientAccessToken(): string | null {
  return currentAccessToken;
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
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
