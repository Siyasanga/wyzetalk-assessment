import type { AccessTokenClaims } from '@wyzetalk/db/types';
import { USER_ROLES } from '@wyzetalk/db/types';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { unauthorizedError } from './http-errors.js';

const claimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  role: z.enum(USER_ROLES),
});

export type SignedToken = {
  token: string;
  expiresIn: number;
}

export function signAccessToken(claims: AccessTokenClaims): SignedToken {
  const token = jwt.sign(claims, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN_SECONDS,
    issuer: 'wyzetalk-helpdesk',
  });

  return { token, expiresIn: env.JWT_EXPIRES_IN_SECONDS };
}

/** Verifies the signature *and* the payload shape — a valid signature over junk is still junk. */
export function verifyAccessToken(token: string): AccessTokenClaims {
  let decoded: unknown;

  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { issuer: 'wyzetalk-helpdesk' });
  } catch (error) {
    const message =
      error instanceof jwt.TokenExpiredError ? 'Your session has expired.' : 'Invalid access token.';
    throw unauthorizedError(message);
  }

  const claims = claimsSchema.safeParse(decoded);
  if (!claims.success) throw unauthorizedError('Invalid access token.');

  return claims.data;
}
