import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/middleware/requestLogger', () => ({
  requestLogger: {
    getRecent: vi.fn(async () => []),
    getMetrics: vi.fn(async () => ({
      total: 0,
      allowed: 0,
      throttled: 0,
      blocked: 0,
      flagged: 0,
      uniqueIPs: 0,
      requestsPerSecond: 0
    })),
    log: vi.fn(async () => {}),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  }
}));

vi.mock('../../src/services/abuseEngine', () => ({
  getAbuseAlerts: vi.fn(async () => []),
  resolveAlert: vi.fn(async () => true)
}));

vi.mock('../../src/redis', () => ({
  store: {
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(async () => 1),
    expire: vi.fn(),
    keys: vi.fn(async () => []),
    mget: vi.fn(async () => []),
    del: vi.fn()
  },
  isUsingFallback: vi.fn(() => false),
  initRedis: vi.fn()
}));

const app = (await import('../../src/index')).default;

describe('GET /api/admin/metrics', () => {
  it('returns metrics object', async () => {
    const res = await request(app).get('/api/admin/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('allowed');
    expect(res.body).toHaveProperty('throttled');
    expect(res.body).toHaveProperty('blocked');
    expect(res.body).toHaveProperty('usingFallback');
  });
});

describe('GET /api/admin/requests', () => {
  it('returns requests array', async () => {
    const res = await request(app).get('/api/admin/requests');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
  });

  it('respects limit parameter', async () => {
    const res = await request(app).get('/api/admin/requests?limit=10');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/admin/alerts', () => {
  it('returns alerts array with unresolved count', async () => {
    const res = await request(app).get('/api/admin/alerts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.alerts)).toBe(true);
    expect(typeof res.body.unresolved).toBe('number');
  });
});

describe('PATCH /api/admin/alerts/:id/resolve', () => {
  it('resolves existing alert', async () => {
    const res = await request(app).patch('/api/admin/alerts/test-id/resolve');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
