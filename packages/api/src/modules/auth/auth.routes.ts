import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authController } from './auth.controller.js';

export const authRoutes: ExpressRouter = Router();

authRoutes.post('/register', asyncHandler(authController.register));
authRoutes.post('/login', asyncHandler(authController.login));
authRoutes.get('/me', authenticate, asyncHandler(authController.me));
