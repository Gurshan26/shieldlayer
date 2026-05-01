import { beforeEach, describe, expect, it, vi } from 'vitest';

const ipStore = new Map<string, string>();

vi.mock('../../src/redis', () => ({
  store: {
    get: vi.fn(async (k: string) => ipStore.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => {
      ipStore.set(k, v);
    }),
    del: vi.fn(async (k: string) => {
      ipStore.delete(k);
    }),
    keys: vi.fn(async () => [...ipStore.keys()].filter((k) => k.startsWith('ip:'))),
    mget: vi.fn(async (ks: string[]) => ks.map((k) => ipStore.get(k) ?? null)),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => {})
  }
}));

import {
  allowlistIP,
  blockIP,
  flagIP,
  getAllIPRecords,
  isAllowlisted,
  isBlocked,
  removeIPRecord
} from '../../src/services/ipBlocklist';

const TEST_IP = '203.0.113.1';

beforeEach(() => ipStore.clear());

describe('blockIP', () => {
  it('marks IP as blocked', async () => {
    await blockIP(TEST_IP, 'test reason');
    const blocked = await isBlocked(TEST_IP);
    expect(blocked).toBe(true);
  });

  it('stores reason', async () => {
    const record = await blockIP(TEST_IP, 'abuse detected');
    expect(record.reason).toBe('abuse detected');
  });

  it('sets expiry for temporary blocks', async () => {
    const record = await blockIP(TEST_IP, 'temp', false);
    expect(record.expiresAt).toBeDefined();
    expect(record.expiresAt!).toBeGreaterThan(Date.now());
  });

  it('no expiry for permanent blocks', async () => {
    const record = await blockIP(TEST_IP, 'permanent', true);
    expect(record.expiresAt).toBeUndefined();
  });
});

describe('allowlistIP', () => {
  it('marks IP as allowed', async () => {
    await allowlistIP(TEST_IP);
    const allowed = await isAllowlisted(TEST_IP);
    expect(allowed).toBe(true);
  });

  it('blocked IP is not allowlisted', async () => {
    await blockIP(TEST_IP, 'bad');
    const allowed = await isAllowlisted(TEST_IP);
    expect(allowed).toBe(false);
  });
});

describe('flagIP', () => {
  it('marks IP as flagged with score', async () => {
    const record = await flagIP(TEST_IP, 'suspicious pattern', 40);
    expect(record.status).toBe('flagged');
    expect(record.abuseScore).toBeGreaterThan(0);
  });

  it('does not downgrade blocked IP to flagged', async () => {
    await blockIP(TEST_IP, 'already blocked');
    const record = await flagIP(TEST_IP, 'more flags', 30);
    expect(record.status).toBe('blocked');
  });

  it('accumulates abuse score on re-flagging', async () => {
    await flagIP(TEST_IP, 'first flag', 30);
    const record = await flagIP(TEST_IP, 'second flag', 30);
    expect(record.abuseScore).toBeGreaterThan(30);
  });
});

describe('removeIPRecord', () => {
  it('returns false for non-existent IP', async () => {
    const result = await removeIPRecord('0.0.0.0');
    expect(result).toBe(false);
  });

  it('removes blocked IP', async () => {
    await blockIP(TEST_IP, 'test');
    const removed = await removeIPRecord(TEST_IP);
    expect(removed).toBe(true);
    expect(await isBlocked(TEST_IP)).toBe(false);
  });
});

describe('isBlocked', () => {
  it('returns false for unknown IP', async () => {
    expect(await isBlocked('1.2.3.4')).toBe(false);
  });

  it('returns false for expired block', async () => {
    ipStore.set(
      'ip:9.9.9.9',
      JSON.stringify({
        ip: '9.9.9.9',
        status: 'blocked',
        addedAt: Date.now() - 7_200_000,
        expiresAt: Date.now() - 1000,
        abuseScore: 100,
        requestCount: 0,
        lastSeen: Date.now(),
        autoBlocked: false
      })
    );

    expect(await isBlocked('9.9.9.9')).toBe(false);
  });
});

describe('getAllIPRecords', () => {
  it('returns records array', async () => {
    await blockIP(TEST_IP, 'test reason');
    const records = await getAllIPRecords();
    expect(Array.isArray(records)).toBe(true);
  });
});
