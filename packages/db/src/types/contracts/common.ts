/**
 * Wire contracts: the exact shapes that cross the HTTP boundary.
 *
 * Every request schema lives here so the API validates and the React client
 * builds against one definition. Dates are ISO strings on the wire; `Date`
 * objects only exist inside the domain.
 */

import { z } from 'zod';
import { ENTITY_ID_PATTERN } from '../domain/common.js';

export const entityIdSchema = z
  .string()
  .regex(ENTITY_ID_PATTERN, 'Must be a 24-character hex id.');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const sortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof sortOrderSchema>;

/** Envelope for a paged listing. */
export type PageDto<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

/** The single error shape the API ever returns. */
export type ApiErrorDto = {
  error: {
    code: string;
    message: string;
    /** Field-level problems, keyed by dotted path, when validation failed. */
    details?: Record<string, string[]>;
  };
}
