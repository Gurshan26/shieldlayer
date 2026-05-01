import crypto from 'crypto';
import { store } from '../redis';
import { ApiKeyRecord, QuotaDefinition, QuotaTier, QUOTA_TIERS } from '../types';

const API_KEYS_PREFIX = 'apikeys:';

function generateApiKey(tier: QuotaTier): string {
  return `sl_${tier.slice(0, 3)}_${crypto.randomBytes(16).toString('hex')}`;
}

export async function createApiKey(label: string, tier: QuotaTier): Promise<ApiKeyRecord> {
  const key = generateApiKey(tier);
  const record: ApiKeyRecord = {
    key,
    label: label.trim(),
    tier,
    active: true,
    createdAt: Date.now(),
    requestCount: 0,
    blockedCount: 0
  };
  await store.set(`${API_KEYS_PREFIX}${key}`, JSON.stringify(record));
  return record;
}

export async function getApiKey(key: string): Promise<ApiKeyRecord | null> {
  const raw = await store.get(`${API_KEYS_PREFIX}${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiKeyRecord;
  } catch {
    return null;
  }
}

export async function getAllApiKeys(): Promise<ApiKeyRecord[]> {
  const keys = await store.keys(`${API_KEYS_PREFIX}*`);
  if (keys.length === 0) return [];
  const records = await store.mget(keys);
  return records
    .filter(Boolean)
    .map((record) => {
      try {
        return JSON.parse(record as string) as ApiKeyRecord;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as ApiKeyRecord[];
}

export async function updateApiKey(key: string, updates: Partial<ApiKeyRecord>): Promise<boolean> {
  const record = await getApiKey(key);
  if (!record) return false;
  const updated: ApiKeyRecord = { ...record, ...updates, key: record.key };
  await store.set(`${API_KEYS_PREFIX}${key}`, JSON.stringify(updated));
  return true;
}

export async function revokeApiKey(key: string): Promise<boolean> {
  const existing = await getApiKey(key);
  if (!existing) return false;
  await store.del(`${API_KEYS_PREFIX}${key}`);
  return true;
}

export async function getQuotaForKey(key: string): Promise<QuotaDefinition | null> {
  const record = await getApiKey(key);
  if (!record || !record.active) return null;
  return QUOTA_TIERS[record.tier];
}

export function getQuotaForTier(tier: QuotaTier): QuotaDefinition {
  return QUOTA_TIERS[tier];
}

export async function incrementApiKeyUsage(key: string, blocked = false): Promise<void> {
  const record = await getApiKey(key);
  if (!record) return;

  await store.set(
    `${API_KEYS_PREFIX}${key}`,
    JSON.stringify({
      ...record,
      requestCount: record.requestCount + 1,
      blockedCount: record.blockedCount + (blocked ? 1 : 0),
      lastUsed: Date.now()
    })
  );
}

export async function seedDemoKeys(): Promise<void> {
  const existing = await getAllApiKeys();
  if (existing.length > 0) return;

  const demos: { label: string; tier: QuotaTier }[] = [
    { label: 'Demo Free Tier', tier: 'free' },
    { label: 'Demo Basic Tier', tier: 'basic' },
    { label: 'Demo Pro Tier', tier: 'pro' },
    { label: 'Demo Enterprise Tier', tier: 'enterprise' }
  ];

  for (const demo of demos) {
    await createApiKey(demo.label, demo.tier);
  }

  console.log('Demo API keys seeded.');
}

export { QUOTA_TIERS };
