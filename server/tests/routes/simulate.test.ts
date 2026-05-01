import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/services/spamSimulator', () => ({
  runSimulation: vi.fn(async (scenario: string) => ({
    scenario,
    description: 'Test simulation',
    totalRequests: 10,
    throttled: 3,
    blocked: 1,
    flagged: 2,
    autoBlocked: ['198.51.100.1'],
    durationMs: 500
  })),
  getScenarios: vi.fn(() => [
    { key: 'burst', description: 'Burst test', totalRequests: 200 },
    { key: 'distributed', description: 'Distributed test', totalRequests: 150 }
  ])
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

describe('GET /api/simulate/scenarios', () => {
  it('returns list of scenarios', async () => {
    const res = await request(app).get('/api/simulate/scenarios');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.scenarios)).toBe(true);
  });
});

describe('POST /api/simulate/run', () => {
  it('runs simulation for valid scenario', async () => {
    const res = await request(app).post('/api/simulate/run').send({ scenario: 'burst' });
    expect(res.status).toBe(200);
    expect(res.body.scenario).toBe('burst');
    expect(typeof res.body.throttled).toBe('number');
    expect(typeof res.body.blocked).toBe('number');
  });

  it('returns 400 for invalid scenario', async () => {
    const res = await request(app).post('/api/simulate/run').send({ scenario: 'not-a-scenario' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing scenario', async () => {
    const res = await request(app).post('/api/simulate/run').send({});
    expect(res.status).toBe(400);
  });
});
