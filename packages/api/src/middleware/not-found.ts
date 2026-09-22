import type { NextFunction, Request, Response } from 'express';
import { notFoundError } from '../lib/http-errors.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(notFoundError(`Route ${req.method} ${req.originalUrl}`));
}
