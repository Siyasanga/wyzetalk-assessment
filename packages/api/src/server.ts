import { connectToDatabase, disconnectFromDatabase } from '@wyzetalk/db';
import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';

async function bootstrap(): Promise<void> {
  await connectToDatabase({ uri: env.MONGODB_URI, syncIndexes: !env.isProduction });
  console.log('[api] connected to MongoDB');

  const server = createApp().listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`);
  });

  registerShutdownHandlers(server);
}

/** Finish in-flight requests, then close the database, then exit. */
function registerShutdownHandlers(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    void (async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`[api] ${signal} received, shutting down`);

      server.close(async (error) => {
        if (error) console.error('[api] error while closing the http server', error);
        await disconnectFromDatabase();
        process.exit(error ? 1 : 0);
      });

      // Do not hang forever on a stuck connection.
      setTimeout(() => process.exit(1), 10_000).unref();
    })();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error: unknown) => {
  console.error('[api] failed to start', error);
  process.exit(1);
});
