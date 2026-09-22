import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { isDatabaseConnected } from '@wyzetalk/db';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { ticketRoutes } from '../modules/tickets/ticket.routes.js';
import { userRoutes } from '../modules/users/user.routes.js';

export const apiRoutes: ExpressRouter = Router();

apiRoutes.get('/health', (_req, res) => {
  const connected = isDatabaseConnected();

  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'degraded',
    database: connected ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', userRoutes);
apiRoutes.use('/tickets', ticketRoutes);
