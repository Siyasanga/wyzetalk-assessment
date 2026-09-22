import type { Actor } from '@wyzetalk/db/types';

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware once a bearer token checks out. */
      actor?: Actor;
    }
  }
}

export {};
