import mongoose from 'mongoose';

/**
 * Driver errors, translated into something the HTTP layer can map to a status
 * without knowing what Mongoose is.
 */
export type DatabaseErrorKind = 'invalid_id' | 'validation' | 'duplicate';

export type DatabaseErrorInfo = {
  kind: DatabaseErrorKind;
  message: string;
  details?: Record<string, string[]>;
}

/** Returns `null` when the error did not come from the data layer. */
export function describeDatabaseError(error: unknown): DatabaseErrorInfo | null {
  if (error instanceof mongoose.Error.CastError) {
    return { kind: 'invalid_id', message: `"${String(error.value)}" is not a valid id.` };
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string[]> = {};
    for (const [path, issue] of Object.entries(error.errors)) {
      details[path] = [issue.message];
    }

    return { kind: 'validation', message: 'The request failed validation.', details };
  }

  // Duplicate key on a unique index — two users with the same email, for instance.
  if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000) {
    return { kind: 'duplicate', message: 'That record already exists.' };
  }

  return null;
}
