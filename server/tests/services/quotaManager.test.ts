import { beforeEach, describe, expect, it, vi } from 'vitest';

const qStore = new Map<string, string>();

vi.mock('../../src/redis', () => ({
  store: {
    get: vi.fn(async (k: string) => qStore.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => {
      qStore.set(k, v);
    }),
    keys: vi.fn(async () => [...qStore.keys()].filter((k) => k.startsWith('apikeys:'))),
    mget: vi.fn(async (ks: string[]) => ks.map((k) => qStore.get(k) ?? null)),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => {}),
    del: vi.fn(async () => {})
  }
}));

import { createApiKey, getApiKey, getQuotaForKey, getQuotaForTier, QUOTA_TIERS } from '../../src/services/quotaManager';
import { QuotaTier } from '../../src/types';

beforeEach(() => qStore.clear());

describe('createApiKey', () => {
  it('creates key with correct tier', async () => {
    const key = await createApiKey('Test Key', 'free');
    expect(key.tier).toBe('free');
    expect(key.active).toBe(true);
  });

  it('generates unique keys', async () => {
    const k1 = await createApiKey('Key 1', 'basic');
    const k2 = await createApiKey('Key 2', 'basic');
    expect(k1.key).not.toBe(k2.key);
  });

  it('key format starts with sl_', async () => {
    const key = await createApiKey('Format Test', 'pro');
    expect(key.key).toMatch(/^sl_/);
  });

  it('initialises requestCount to 0', async () => {
    const key = await createApiKey('Count Test', 'free');
    expect(key.requestCount).toBe(0);
    expect(key.blockedCount).toBe(0);
  });
});

describe('getApiKey', () => {
  it('returns null for non-existent key', async () => {
    const result = await getApiKey('sl_xxx_nonexistent');
    expect(result).toBeNull();
  });

  it('retrieves created key', async () => {
    const created = await createApiKey('Get Test', 'basic');
    const retrieved = await getApiKey(created.key);
    expect(retrieved?.key).toBe(created.key);
    expect(retrieved?.label).toBe('Get Test');
  });
});

describe('getQuotaForKey', () => {
  it('returns null for non-existent key', async () => {
    const result = await getQuotaForKey('invalid-key');
    expect(result).toBeNull();
  });

  it('returns correct quota for valid active key', async () => {
    const key = await createApiKey('Quota Test', 'pro');
    const quota = await getQuotaForKey(key.key);
    expect(quota?.rpm).toBe(QUOTA_TIERS.pro.rpm);
    expect(quota?.rpd).toBe(QUOTA_TIERS.pro.rpd);
  });
});

describe('getQuotaForTier', () => {
  const tiers: QuotaTier[] = ['free', 'basic', 'pro', 'enterprise'];

  tiers.forEach((tier) => {
    it(`returns quota for ${tier} tier`, () => {
      const quota = getQuotaForTier(tier);
      expect(quota.tier).toBe(tier);
      expect(quota.rpm).toBeGreaterThan(0);
      expect(quota.rpd).toBeGreaterThan(quota.rpm);
    });
  });

  it('enterprise has highest limits', () => {
    const enterprise = getQuotaForTier('enterprise');
    const pro = getQuotaForTier('pro');
    expect(enterprise.rpm).toBeGreaterThan(pro.rpm);
  });

  it('tiers are ordered: free < basic < pro < enterprise', () => {
    expect(getQuotaForTier('free').rpm).toBeLessThan(getQuotaForTier('basic').rpm);
    expect(getQuotaForTier('basic').rpm).toBeLessThan(getQuotaForTier('pro').rpm);
    expect(getQuotaForTier('pro').rpm).toBeLessThan(getQuotaForTier('enterprise').rpm);
  });
});
