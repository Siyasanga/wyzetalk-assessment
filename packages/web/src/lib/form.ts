import type { ZodError } from 'zod';

export type FieldErrors = Record<string, string[]>;

/** Same shape the API returns for a 422, so one renderer handles both sources. */
export function toFieldErrors(error: ZodError): FieldErrors {
  const fields: FieldErrors = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    fields[path] = [...(fields[path] ?? []), issue.message];
  }

  return fields;
}

export function firstError(fields: FieldErrors, name: string): string | undefined {
  return fields[name]?.[0];
}
