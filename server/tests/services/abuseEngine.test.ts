import { beforeEach, describe, expect, it, vi } from 'vitest';

const abuseStore = new Map<string, string>();
let counter = 0;

vi.mock('../../src/redis', () => ({
  store: {
    get: vi.fn(async (k: string) => abuseStore.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => {
      abuseStore.set(k, v);
    }),
    incr: vi.fn(async (k: string) => {
      const v = parseInt(abuseStore.get(k) || '0', 10) + 1;
      abuseStore.set(k, String(v));
      return v;
    }),
    expire: vi.fn(async () => {}),
    del: vi.fn(async () => {}),
    keys: vi.fn(async () => []),
    mget: vi.fn(async () => [])
  }
}));

vi.mock('../../src/services/ipBlocklist', () => ({
  autoBlockIP: vi.fn(async () => ({
    ip: 'test',
    status: 'blocked',
    abuseScore: 100,
    addedAt: Date.now(),
    requestCount: 0,
    lastSeen: Date.now(),
    autoBlocked: true
  })),
  flagIP: vi.fn(async () => ({
    ip: 'test',
    status: 'flagged',
    abuseScore: 40,
    addedAt: Date.now(),
    requestCount: 0,
    lastSeen: Date.now(),
    autoBlocked: false
  }))
}));

import { analyseRequest, getAbuseAlerts, resolveAlert } from '../../src/services/abuseEngine';
import type { RequestRecord } from '../../src/types';

function makeRequest(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    id: String(++counter),
    timestamp: Date.now(),
    ip: `203.0.113.${counter % 250}`,
    method: 'GET',
    endpoint: '/api/test',
    statusCode: 200,
    requestStatus: 'allowed',
    responseTimeMs: 10,
    ...overrides
  };
}

beforeEach(() => {
  abuseStore.clear();
  counter = 0;
});

describe('analyseRequest — suspicious user agents', () => {
  it('flags nikto user agent', async () => {
    const req = makeRequest({ userAgent: 'nikto/2.1.6 (Evasions:None)' });
    const result = await analyseRequest(req);
    expect(result.abuseFlags).toContain('suspicious_user_agent');
    expect(result.abuseScore).toBeGreaterThan(0);
  });

  it('flags sqlmap user agent', async () => {
    const req = makeRequest({ userAgent: 'sqlmap/1.7.8#stable' });
    const result = await analyseRequest(req);
    expect(result.abuseFlags).toContain('suspicious_user_agent');
  });

  it('does not flag normal browser user agent', async () => {
    const req = makeRequest({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' });
    const result = await analyseRequest(req);
    expect(result.abuseFlags).not.toContain('suspicious_user_agent');
  });

  it('does not flag missing user agent', async () => {
    const req = makeRequest({ userAgent: undefined });
    const result = await analyseRequest(req);
    expect(result.abuseFlags).not.toContain('suspicious_user_agent');
  });
});

describe('analyseRequest — credential stuffing', () => {
  it('detects high 401 rate', async () => {
    const ip = '203.0.113.99';
    for (let i = 0; i < 25; i += 1) {
      await analyseRequest(makeRequest({ ip, statusCode: 401, endpoint: '/api/auth/login' }));
    }
    const last = await analyseRequest(makeRequest({ ip, statusCode: 401, endpoint: '/api/auth/login' }));
    const hasCredStuffing = last.abuseFlags.includes('credential_stuffing');
    expect(typeof hasCredStuffing).toBe('boolean');
  });
});

describe('analyseRequest — return values', () => {
  it('returns abuseFlags as array', async () => {
    const result = await analyseRequest(makeRequest());
    expect(Array.isArray(result.abuseFlags)).toBe(true);
  });

  it('returns abuseScore as number >= 0', async () => {
    const result = await analyseRequest(makeRequest());
    expect(typeof result.abuseScore).toBe('number');
    expect(result.abuseScore).toBeGreaterThanOrEqual(0);
  });

  it('returns shouldAutoBlock as boolean', async () => {
    const result = await analyseRequest(makeRequest());
    expect(typeof result.shouldAutoBlock).toBe('boolean');
  });
});

describe('getAbuseAlerts', () => {
  it('returns empty array when no alerts', async () => {
    const alerts = await getAbuseAlerts();
    expect(Array.isArray(alerts)).toBe(true);
  });

  it('respects limit parameter', async () => {
    abuseStore.set(
      'abuse:alerts',
      JSON.stringify(
        Array.from({ length: 100 }, (_, i) => ({
          id: String(i),
          ip: '1.2.3.4',
          reason: 'burst_attack',
          severity: 'high',
          timestamp: Date.now(),
          requestCount: 50,
          windowMs: 10000,
          autoBlocked: false,
          resolved: false,
          details: 'test'
        }))
      )
    );
    const alerts = await getAbuseAlerts(10);
    expect(alerts.length).toBeLessThanOrEqual(10);
  });
});

describe('resolveAlert', () => {
  it('returns false for non-existent alert', async () => {
    const result = await resolveAlert('nonexistent-id');
    expect(result).toBe(false);
  });

  it('marks alert as resolved', async () => {
    abuseStore.set(
      'abuse:alerts',
      JSON.stringify([
        {
          id: 'test-alert',
          ip: '1.2.3.4',
          reason: 'burst_attack',
          severity: 'high',
          timestamp: Date.now(),
          requestCount: 50,
          windowMs: 10000,
          autoBlocked: false,
          resolved: false,
          details: 'test'
        }
      ])
    );

    const result = await resolveAlert('test-alert');
    expect(result).toBe(true);

    const alerts = await getAbuseAlerts();
    expect(alerts.find((a) => a.id === 'test-alert')?.resolved).toBe(true);
  });
});
