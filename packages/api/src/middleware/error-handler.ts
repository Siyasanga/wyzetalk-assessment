import { describeDatabaseError } from '@wyzetalk/db';
import { type ApiErrorDto, isDomainError, isInvalidStatusTransitionError } from '@wyzetalk/db/types';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { isHttpError } from '../lib/http-errors.js';

type NormalizedError = {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

/** Turns a ZodError into `{ "title": ["Title is too short."] }`. */
function fieldErrors(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    details[path] = [...(details[path] ?? []), issue.message];
  }

  return details;
}

function normalize(error: unknown): NormalizedError {
  if (isHttpError(error)) {
    const normalized: NormalizedError = { status: error.status, code: error.code, message: error.message };
    return error.details ? { ...normalized, details: error.details } : normalized;
  }

  if (error instanceof ZodError) {
    return {
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'The request failed validation.',
      details: fieldErrors(error),
    };
  }

  // An illegal lifecycle move is a conflict with the ticket's current state.
  if (isInvalidStatusTransitionError(error)) {
    return { status: 409, code: error.code, message: error.message };
  }

  if (isDomainError(error)) {
    return { status: 400, code: error.code, message: error.message };
  }

  // Driver errors are described by `@wyzetalk/db`, so nothing here imports mongoose.
  const database = describeDatabaseError(error);

  if (database) {
    switch (database.kind) {
      case 'invalid_id':
        return { status: 400, code: 'BAD_REQUEST', message: database.message };
      case 'validation':
        return {
          status: 422,
          code: 'VALIDATION_FAILED',
          message: database.message,
          ...(database.details ? { details: database.details } : {}),
        };
      case 'duplicate':
        return { status: 409, code: 'CONFLICT', message: database.message };
    }
  }

  return { status: 500, code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' };
}

export function errorHandler(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const normalized = normalize(error);

  if (normalized.status >= 500) {
    console.error('[api] unhandled error', error);
  }

  const body: ApiErrorDto = {
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
    },
  };

  // A stack trace is useful locally and a liability in production.
  if (!env.isProduction && normalized.status >= 500 && error instanceof Error) {
    (body.error as Record<string, unknown>).stack = error.stack;
  }

  res.status(normalized.status).json(body);
}

/** Exported for tests: the status mapping is the part worth asserting on. */
export const __testing = { normalize };
