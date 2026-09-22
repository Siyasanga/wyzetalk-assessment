import { type Actor, toUserId } from '@wyzetalk/db/types';
import type { NextFunction, Request, Response } from 'express';
import { unauthorizedError } from '../lib/http-errors.js';
import { verifyAccessToken } from '../lib/jwt.js';

function readBearerToken(req: Request): string | null {
  const header = req.header('authorization');
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;

  return token.trim() || null;
}

/** Rejects the request unless it carries a valid bearer token. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = readBearerToken(req);

  if (!token) {
    next(unauthorizedError('A bearer token is required.'));
    return;
  }

  try {
    const claims = verifyAccessToken(token);
    req.actor = { id: toUserId(claims.sub), email: claims.email, role: claims.role };
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Narrows `req.actor` for handlers mounted behind `authenticate`, so controllers
 * work with a definite `Actor` instead of an optional one.
 */
export function requireActor(req: Request): Actor {
  if (!req.actor) throw unauthorizedError();
  return req.actor;
}
