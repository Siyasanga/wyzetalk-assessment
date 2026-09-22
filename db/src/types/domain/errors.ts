/**
 * Errors the domain itself can raise. They carry a stable `code` so the HTTP
 * layer can map them to a status without string-matching messages.
 *
 * They are plain `Error` objects built by factories rather than subclasses, so
 * there is nothing to `instanceof`: narrow with the guards at the bottom. The
 * brand symbol is what the guards actually test, so a foreign object that
 * happens to carry a `code` is never mistaken for one of ours.
 */

export type DomainErrorCode =
  | 'INVALID_ID'
  | 'INVALID_STATUS_TRANSITION'
  | 'TICKET_NOT_ASSIGNABLE';

const DOMAIN_ERROR = Symbol.for('@wyzetalk/db#DomainError');

export type DomainError = Error & {
  readonly code: DomainErrorCode;
};

export type InvalidStatusTransitionError = DomainError & {
  readonly code: 'INVALID_STATUS_TRANSITION';
  readonly from: string;
  readonly to: string;
};

export type DomainErrorInit = {
  code: DomainErrorCode;
  message: string;
  /** Kept for stack traces and logs, where the old class names still read well. */
  name?: string;
};

export function domainError({ code, message, name = 'DomainError' }: DomainErrorInit): DomainError {
  const error = new Error(message) as Error & { code: DomainErrorCode };
  error.name = name;
  error.code = code;

  // Non-enumerable, so the brand stays out of serialized output.
  Object.defineProperty(error, DOMAIN_ERROR, { value: true });

  return error;
}

export function invalidIdError(value: unknown, kind: string): DomainError {
  return domainError({
    code: 'INVALID_ID',
    message: `"${String(value)}" is not a valid ${kind}.`,
    name: 'InvalidIdError',
  });
}

export function invalidStatusTransitionError(from: string, to: string): InvalidStatusTransitionError {
  const error = domainError({
    code: 'INVALID_STATUS_TRANSITION',
    message: `A ticket cannot move from "${from}" to "${to}".`,
    name: 'InvalidStatusTransitionError',
  }) as InvalidStatusTransitionError & { from: string; to: string };

  error.from = from;
  error.to = to;

  return error;
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof Error && DOMAIN_ERROR in value;
}

export function isInvalidStatusTransitionError(value: unknown): value is InvalidStatusTransitionError {
  return isDomainError(value) && value.code === 'INVALID_STATUS_TRANSITION';
}
