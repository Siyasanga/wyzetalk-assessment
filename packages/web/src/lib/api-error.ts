import type { ApiErrorDto } from '@wyzetalk/db/types';

/**
 * Every failure the UI has to render — transport, validation or domain — arrives
 * as this one shape, so components never branch on `fetch` internals.
 */
export type ApiError = Error & {
  readonly name: 'ApiError';
  readonly status: number;
  readonly code: string;
  /** Field-level problems keyed by form field, empty when the failure was not a validation one. */
  readonly fieldErrors: Record<string, string[]>;
};

export function createApiError(params: {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}): ApiError {
  const error = new Error(params.message) as Error & {
    name: 'ApiError';
    status: number;
    code: string;
    fieldErrors: Record<string, string[]>;
  };

  error.name = 'ApiError';
  error.status = params.status;
  error.code = params.code;
  error.fieldErrors = params.fieldErrors ?? {};

  return error;
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof Error && value.name === 'ApiError';
}

/** Narrows an unknown response body to the API's error envelope. */
export function isApiErrorDto(value: unknown): value is ApiErrorDto {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = (value as { error?: unknown }).error;
  return typeof candidate === 'object' && candidate !== null && 'message' in candidate;
}

export function errorMessage(error: unknown): string {
  if (isApiError(error) || error instanceof Error) return error.message;
  return 'Something went wrong.';
}
