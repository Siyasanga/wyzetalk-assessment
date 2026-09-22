import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { userController } from './user.controller.js';

export const userRoutes: ExpressRouter = Router();

// Everything below needs a token; the finer rules are enforced in the service.
userRoutes.use(authenticate);

userRoutes.get('/', authorize('admin'), asyncHandler(userController.list));
userRoutes.post('/', authorize('admin'), asyncHandler(userController.create));

// Self-service is allowed here, so no role guard — `UserService` checks ownership.
userRoutes.get('/:id', asyncHandler(userController.getById));
userRoutes.patch('/:id', asyncHandler(userController.update));

userRoutes.delete('/:id', authorize('admin'), asyncHandler(userController.remove));
