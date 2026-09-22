import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/wyzetalk_helpdesk_test',
      JWT_SECRET: 'test-secret-that-is-long-enough-for-validation',
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
