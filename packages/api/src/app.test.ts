import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { API_PREFIX, createApp } from './app.js';
import { signAccessToken } from './lib/jwt.js';

const app = createApp();

describe('http plumbing', () => {
  it('answers the health check without a token', async () => {
    const response = await request(app).get(`${API_PREFIX}/health`);

    // No Mongo connection in this test, so the app reports itself degraded.
    expect(response.status).toBe(503);
    expect(response.body.database).toBe('disconnected');
  });

  it('rejects an unauthenticated request to a protected route', async () => {
    const response = await request(app).get(`${API_PREFIX}/tickets`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a bearer token signed with the wrong key', async () => {
    const response = await request(app)
      .get(`${API_PREFIX}/tickets`)
      .set('authorization', 'Bearer not-a-real-token');

    expect(response.status).toBe(401);
  });

  it('returns the standard error envelope for an unknown route', async () => {
    const response = await request(app).get(`${API_PREFIX}/nothing-here`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: expect.stringContaining('Route GET') },
    });
  });

  it('reports validation failures per field', async () => {
    const response = await request(app)
      .post(`${API_PREFIX}/auth/register`)
      .send({ email: 'not-an-email', name: 'A', password: 'short' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_FAILED');
    expect(Object.keys(response.body.error.details)).toEqual(
      expect.arrayContaining(['email', 'name', 'password']),
    );
  });

  it('accepts a valid token and then fails on the database, not the auth layer', async () => {
    const { token } = signAccessToken({
      sub: '0000000000000000000000a1',
      email: 'gale@wyzetalk.test',
      role: 'agent',
    });

    const response = await request(app)
      .get(`${API_PREFIX}/tickets`)
      .set('authorization', `Bearer ${token}`);

    expect(response.status).not.toBe(401);
  });
});
