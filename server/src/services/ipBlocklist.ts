import { store } from '../redis';
import { IPRecord } from '../types';

const BLOCKLIST_PREFIX = 'ip:';

function ipKey(ip: string): string {
  return `${BLOCKLIST_PREFIX}${ip}`;
}

export async function getIPRecord(ip: string): Promise<IPRecord | null> {
  const raw = await store.get(ipKey(ip));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as IPRecord;
  } catch {
    return null;
  }
}

export async function blockIP(ip: string, reason: string, permanent = false): Promise<IPRecord> {
  const existing = await getIPRecord(ip);
  const record: IPRecord = {
    ip,
    status: 'blocked',
    addedAt: existing?.addedAt || Date.now(),
    expiresAt: permanent ? undefined : Date.now() + 24 * 60 * 60 * 1000,
    reason,
    requestCount: existing?.requestCount || 0,
    lastSeen: Date.now(),
    abuseScore: existing?.abuseScore || 100,
    autoBlocked: false
  };

  const ttl = permanent ? undefined : 24 * 60 * 60 * 1000;
  await store.set(ipKey(ip), JSON.stringify(record), ttl);
  return record;
}

export async function autoBlockIP(ip: string, reason: string): Promise<IPRecord> {
  const existing = await getIPRecord(ip);
  const record: IPRecord = {
    ip,
    status: 'blocked',
    addedAt: existing?.addedAt || Date.now(),
    expiresAt: Date.now() + 60 * 60 * 1000,
    reason: `Auto-blocked: ${reason}`,
    requestCount: existing?.requestCount || 0,
    lastSeen: Date.now(),
    abuseScore: 100,
    autoBlocked: true
  };

  await store.set(ipKey(ip), JSON.stringify(record), 60 * 60 * 1000);
  return record;
}

export async function allowlistIP(ip: string, reason?: string): Promise<IPRecord> {
  const existing = await getIPRecord(ip);
  const record: IPRecord = {
    ip,
    status: 'allowed',
    addedAt: existing?.addedAt || Date.now(),
    reason: reason || 'Manually allowlisted',
    requestCount: existing?.requestCount || 0,
    lastSeen: Date.now(),
    abuseScore: 0,
    autoBlocked: false
  };

  await store.set(ipKey(ip), JSON.stringify(record));
  return record;
}

export async function flagIP(ip: string, reason: string, abuseScore: number): Promise<IPRecord> {
  const existing = await getIPRecord(ip);
  if (existing?.status === 'blocked') return existing;

  const record: IPRecord = {
    ip,
    status: 'flagged',
    addedAt: existing?.addedAt || Date.now(),
    reason,
    requestCount: existing?.requestCount || 0,
    lastSeen: Date.now(),
    abuseScore: Math.min(100, (existing?.abuseScore || 0) + abuseScore),
    autoBlocked: false
  };

  await store.set(ipKey(ip), JSON.stringify(record));
  return record;
}

export async function removeIPRecord(ip: string): Promise<boolean> {
  const existing = await getIPRecord(ip);
  if (!existing) return false;
  await store.del(ipKey(ip));
  return true;
}

export async function isBlocked(ip: string): Promise<boolean> {
  const record = await getIPRecord(ip);
  if (!record) return false;
  if (record.status !== 'blocked') return false;

  if (record.expiresAt && Date.now() > record.expiresAt) {
    await store.del(ipKey(ip));
    return false;
  }

  return true;
}

export async function isAllowlisted(ip: string): Promise<boolean> {
  const record = await getIPRecord(ip);
  return record?.status === 'allowed';
}

export async function getAllIPRecords(): Promise<IPRecord[]> {
  const keys = await store.keys(`${BLOCKLIST_PREFIX}*`);
  if (keys.length === 0) return [];
  const records = await store.mget(keys);
  return records
    .filter(Boolean)
    .map((record) => {
      try {
        return JSON.parse(record as string) as IPRecord;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as IPRecord[];
}

export async function updateIPStats(ip: string, delta: Partial<IPRecord>): Promise<void> {
  const existing = await getIPRecord(ip);
  if (!existing) return;
  await store.set(ipKey(ip), JSON.stringify({ ...existing, ...delta }));
}
