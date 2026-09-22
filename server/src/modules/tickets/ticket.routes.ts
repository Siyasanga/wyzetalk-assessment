import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { ticketController } from './ticket.controller.js';

export const ticketRoutes: ExpressRouter = Router();

ticketRoutes.use(authenticate);

ticketRoutes.get('/', asyncHandler(ticketController.list));
// Declared before '/:id' so "stats" is never read as an id.
ticketRoutes.get('/stats', asyncHandler(ticketController.stats));
ticketRoutes.post('/', asyncHandler(ticketController.create));

ticketRoutes.get('/:id', asyncHandler(ticketController.getById));
ticketRoutes.patch('/:id', asyncHandler(ticketController.update));
ticketRoutes.patch('/:id/status', asyncHandler(ticketController.changeStatus));
ticketRoutes.patch('/:id/assignee', authorize('agent'), asyncHandler(ticketController.assign));
ticketRoutes.delete('/:id', authorize('admin'), asyncHandler(ticketController.remove));
