import { type UserRole, roleAtLeast } from '@wyzetalk/db/types';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { forbiddenError } from '../lib/http-errors.js';
import { requireActor } from './authenticate.js';

/** Coarse route guard. Record-level rules stay in the domain policies. */
export function authorize(minimumRole: UserRole): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const actor = requireActor(req);

      if (!roleAtLeast(actor.role, minimumRole)) {
        throw forbiddenError(`This action requires the "${minimumRole}" role or higher.`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
