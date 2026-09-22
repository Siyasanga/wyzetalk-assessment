import { createApiError, isApiErrorDto } from './api-error';

export type ApiClient = {
  request: <T>(path: string, options?: RequestOptions) => Promise<T>;
};

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

export type ApiClientDeps = {
  baseUrl: string;
  /** Read lazily so a login mid-session is picked up without rebuilding the client. */
  getToken: () => string | null;
  /** Called on a 401 so the app can drop a session the API has stopped accepting. */
  onUnauthorized?: () => void;
};

export function createApiClient(deps: ApiClientDeps): ApiClient {
  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const token = deps.getToken();
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;

    try {
      response = await fetch(`${deps.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        ...(options.signal ? { signal: options.signal } : {}),
      });
    } catch {
      // The request never reached the API: server down, DNS, offline.
      throw createApiError({
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Could not reach the server. Is the API running?',
      });
    }

    if (response.status === 204) return undefined as T;

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) deps.onUnauthorized?.();

      if (isApiErrorDto(payload)) {
        throw createApiError({
          status: response.status,
          code: payload.error.code,
          message: payload.error.message,
          ...(payload.error.details ? { fieldErrors: payload.error.details } : {}),
        });
      }

      throw createApiError({
        status: response.status,
        code: 'UNEXPECTED_ERROR',
        message: `Request failed with status ${response.status}.`,
      });
    }

    return payload as T;
  }

  return { request };
}

/** Same-origin by default: Vite proxies `/api` to Express in development. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
