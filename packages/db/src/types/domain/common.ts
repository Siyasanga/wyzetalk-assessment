/**
 * Primitives shared by every entity in the domain.
 *
 * Nothing in `domain/` may import a framework, a driver or an HTTP concern:
 * this layer is the vocabulary the API, the workers and the React client all
 * agree on, so it has to stay portable.
 */

declare const brand: unique symbol;

/** Nominal typing helper: `Brand<string, 'UserId'>` is not assignable from a bare string. */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

/**
 * Identity of a persisted entity. The store hands out 24-character hex ids,
 * so that is the shape the domain validates against.
 */
export const ENTITY_ID_PATTERN = /^[0-9a-f]{24}$/i;

export function isEntityId(value: unknown): value is string {
  return typeof value === 'string' && ENTITY_ID_PATTERN.test(value);
}

/** An instant, as it travels over the wire. */
export type IsoDateString = Brand<string, 'IsoDateString'>;

export function toIsoDateString(value: Date): IsoDateString {
  return value.toISOString() as IsoDateString;
}

/** Audit columns every entity carries. */
export type Timestamped = {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type PageRequest = {
  readonly page: number;
  readonly limit: number;
}

export type Page<T> = {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly pageCount: number;
}

export function buildPage<T>(items: readonly T[], total: number, { page, limit }: PageRequest): Page<T> {
  return {
    items,
    total,
    page,
    limit,
    pageCount: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}
