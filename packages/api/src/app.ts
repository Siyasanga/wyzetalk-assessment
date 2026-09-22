import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { apiRoutes } from './routes/index.js';

export const API_PREFIX = '/api/v1';

export function createApp(): Express {
  const app = express();

  // Behind a proxy (Heroku, Render, nginx) this makes req.ip and rate limiting honest.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: false,
      // The client sends a bearer token, not a cookie.
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false }));

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  app.use(API_PREFIX, apiRoutes);

  // Unversioned alias, for load balancer and container health checks.
  app.get('/health', (_req, res) => res.redirect(307, `${API_PREFIX}/health`));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
