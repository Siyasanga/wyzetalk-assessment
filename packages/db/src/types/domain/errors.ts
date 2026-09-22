/**
 * Errors the domain itself can raise.
 *
 * These are factory functions rather than a class hierarchy: callers identify
 * them with the type guards below and with the stable `code`, so the HTTP layer
 * can map one to a status without string-matching messages.
 */

export type DomainErrorCode =
  | 'INVALID_ID'
  | 'INVALID_STATUS_TRANSITION'
  | 'TICKET_NOT_ASSIGNABLE';

export type DomainError = Error & {
  readonly isDomainError: true;
  readonly code: DomainErrorCode;
};

export type InvalidStatusTransitionError = DomainError & {
  readonly code: 'INVALID_STATUS_TRANSITION';
  readonly from: string;
  readonly to: string;
};

export function domainError(code: DomainErrorCode, message: string): DomainError {
  return Object.assign(new Error(message), { isDomainError: true as const, code });
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof Error && (value as Partial<DomainError>).isDomainError === true;
}

export function invalidIdError(value: unknown, kind: string): DomainError {
  return domainError('INVALID_ID', `"${String(value)}" is not a valid ${kind}.`);
}

export function invalidStatusTransitionError(from: string, to: string): InvalidStatusTransitionError {
  const error = domainError(
    'INVALID_STATUS_TRANSITION',
    `A ticket cannot move from "${from}" to "${to}".`,
  );

  return Object.assign(error, { code: 'INVALID_STATUS_TRANSITION' as const, from, to });
}

export function isInvalidStatusTransitionError(
  value: unknown,
): value is InvalidStatusTransitionError {
  return isDomainError(value) && value.code === 'INVALID_STATUS_TRANSITION';
}
