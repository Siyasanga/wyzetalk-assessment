/**
 * Transport-level errors. Services throw these; the error handler is the only
 * place that turns them into a response body.
 *
 * Plain `Error` objects with a status attached, built by the factories below.
 * `isHttpError` replaces what used to be an `instanceof HttpError` check.
 */

const HTTP_ERROR = Symbol.for('@wyzetalk/server#HttpError');

export type HttpError = Error & {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;
};

export type HttpErrorInit = {
  status: number;
  code: string;
  message: string;
  /** Kept for stack traces and logs, where the old class names still read well. */
  name?: string;
  details?: Record<string, string[]>;
};

export function httpError({
  status,
  code,
  message,
  name = 'HttpError',
  details,
}: HttpErrorInit): HttpError {
  const error = new Error(message) as Error & {
    status: number;
    code: string;
    details?: Record<string, string[]>;
  };

  error.name = name;
  error.status = status;
  error.code = code;
  if (details) error.details = details;

  // Non-enumerable, so the brand stays out of serialized output.
  Object.defineProperty(error, HTTP_ERROR, { value: true });

  return error;
}

export function badRequestError(
  message = 'Malformed request.',
  details?: Record<string, string[]>,
): HttpError {
  return httpError({ status: 400, code: 'BAD_REQUEST', message, name: 'BadRequestError', details });
}

export function unauthorizedError(message = 'Authentication required.'): HttpError {
  return httpError({ status: 401, code: 'UNAUTHORIZED', message, name: 'UnauthorizedError' });
}

export function forbiddenError(message = 'You do not have access to this resource.'): HttpError {
  return httpError({ status: 403, code: 'FORBIDDEN', message, name: 'ForbiddenError' });
}

export function notFoundError(resource = 'Resource'): HttpError {
  return httpError({
    status: 404,
    code: 'NOT_FOUND',
    message: `${resource} was not found.`,
    name: 'NotFoundError',
  });
}

export function conflictError(message = 'That record already exists.'): HttpError {
  return httpError({ status: 409, code: 'CONFLICT', message, name: 'ConflictError' });
}

export function validationError(
  details: Record<string, string[]>,
  message = 'The request failed validation.',
): HttpError {
  return httpError({
    status: 422,
    code: 'VALIDATION_FAILED',
    message,
    name: 'ValidationError',
    details,
  });
}

export function isHttpError(value: unknown): value is HttpError {
  return value instanceof Error && HTTP_ERROR in value;
}
