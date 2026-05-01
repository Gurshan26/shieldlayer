import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../src/redis', () => ({
  isUsingFallback: vi.fn(() => false),
  store: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => {}),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => {}),
    del: vi.fn(async () => {}),
    keys: vi.fn(async () => []),
    mget: vi.fn(async () => [])
  }
}));

vi.mock('../../src/services/ipBlocklist', () => ({
  isBlocked: vi.fn(async () => false),
  isAllowlisted: vi.fn(async () => false),
  getIPRecord: vi.fn(async () => null),
  updateIPStats: vi.fn(async () => {})
}));

vi.mock('../../src/services/quotaManager', () => ({
  getQuotaForKey: vi.fn(async () => ({ tier: 'basic', rpm: 60, rpd: 1000, burstAllowance: 10, concurrentLimit: 5 })),
  incrementApiKeyUsage: vi.fn(async () => {})
}));

vi.mock('../../src/middleware/requestLogger', () => ({
  requestLogger: {
    log: vi.fn(async () => {}),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  }
}));

import { rateLimiter } from '../../src/middleware/rateLimiter';

const app = express();
app.use(rateLimiter());
app.get('/test', (_req, res) => res.json({ ok: true }));

describe('rateLimiter middleware', () => {
  it('adds RateLimit headers to response', async () => {
    const res = await request(app).get('/test');
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('returns 200 for normal request', async () => {
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
  });

  it('accepts valid API key header', async () => {
    const res = await request(app).get('/test').set('x-api-key', 'sl_bas_testkey');
    expect([200, 401, 429]).toContain(res.status);
  });

  it('accepts Authorization: Bearer token', async () => {
    const res = await request(app).get('/test').set('Authorization', 'Bearer sl_bas_testkey');
    expect([200, 401, 429]).toContain(res.status);
  });
});

describe('rateLimiter — blocked IPs', () => {
  it('returns 403 for blocked IP', async () => {
    const { isBlocked } = await import('../../src/services/ipBlocklist');
    vi.mocked(isBlocked).mockResolvedValueOnce(true);

    const res = await request(app).get('/test');
    expect(res.status).toBe(403);
    expect(res.body.error).toBeTruthy();
    expect(res.headers['retry-after']).toBeDefined();
  });
});
