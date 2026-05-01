import Redis from 'ioredis';

let redisClient: Redis | null = null;
let usingFallback = true;
let initPromise: Promise<void> | null = null;

const memStore = new Map<string, { value: string; expiresAt?: number }>();

function memGet(key: string): string | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memStore.delete(key);
    return null;
  }
  return entry.value;
}

function memSet(key: string, value: string, ttlMs?: number): void {
  memStore.set(key, {
    value,
    expiresAt: ttlMs ? Date.now() + ttlMs : undefined
  });
}

function memIncr(key: string): number {
  const current = parseInt(memGet(key) || '0', 10);
  const next = current + 1;
  const entry = memStore.get(key);
  memStore.set(key, { value: String(next), expiresAt: entry?.expiresAt });
  return next;
}

function memExpire(key: string, ttlMs: number): void {
  const entry = memStore.get(key);
  if (entry) {
    memStore.set(key, { ...entry, expiresAt: Date.now() + ttlMs });
  }
}

export function getRedisClient(): Redis | null {
  if (usingFallback) return null;
  return redisClient;
}

export function isUsingFallback(): boolean {
  return usingFallback;
}

export async function initRedis(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  let client: Redis | null = null;

  try {
    client = new Redis(redisUrl, {
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: () => null
    });

    client.on('error', () => {
      // Suppress noisy reconnect errors when Redis is unavailable locally.
    });

    await client.connect();
    await client.ping();
    redisClient = client;
    usingFallback = false;
    console.log('Redis connected:', redisUrl);
  } catch {
    console.warn('Redis unavailable. Using in-memory fallback store. Data will not persist.');
    usingFallback = true;
    client?.disconnect();
    redisClient = null;
  }
  })();

  return initPromise;
}

export const store = {
  async get(key: string): Promise<string | null> {
    if (redisClient && !usingFallback) return redisClient.get(key);
    return memGet(key);
  },
  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (redisClient && !usingFallback) {
      if (ttlMs) {
        await redisClient.set(key, value, 'PX', ttlMs);
      } else {
        await redisClient.set(key, value);
      }
      return;
    }
    memSet(key, value, ttlMs);
  },
  async incr(key: string): Promise<number> {
    if (redisClient && !usingFallback) return redisClient.incr(key);
    return memIncr(key);
  },
  async expire(key: string, ttlMs: number): Promise<void> {
    if (redisClient && !usingFallback) {
      await redisClient.pexpire(key, ttlMs);
      return;
    }
    memExpire(key, ttlMs);
  },
  async del(key: string): Promise<void> {
    if (redisClient && !usingFallback) {
      await redisClient.del(key);
      return;
    }
    memStore.delete(key);
  },
  async keys(pattern: string): Promise<string[]> {
    if (redisClient && !usingFallback) return redisClient.keys(pattern);
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    return Array.from(memStore.keys()).filter((key) => regex.test(key));
  },
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (redisClient && !usingFallback) return redisClient.mget(keys);
    return keys.map((k) => memGet(k));
  }
};
