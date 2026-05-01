import { store } from '../redis';

export interface WindowResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  retryAfter?: number;
  resetAt: number;
}

export async function checkSlidingWindow(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<WindowResult> {
  const now = Date.now();
  const currentBucket = Math.floor(now / windowMs);
  const prevBucket = currentBucket - 1;

  const currentKey = `rl:${key}:${currentBucket}`;
  const prevKey = `rl:${key}:${prevBucket}`;

  const currentCount = await store.incr(currentKey);
  if (currentCount === 1) {
    await store.expire(currentKey, windowMs * 2);
  }

  const prevStr = await store.get(prevKey);
  const prevCount = prevStr ? parseInt(prevStr, 10) : 0;

  const timeInCurrentWindow = now % windowMs;
  const overlap = (windowMs - timeInCurrentWindow) / windowMs;
  const weightedCount = currentCount + Math.floor(prevCount * overlap);

  const allowed = weightedCount <= maxRequests;
  const remaining = Math.max(0, maxRequests - weightedCount);
  const resetAt = (currentBucket + 1) * windowMs;

  let retryAfter: number | undefined;
  if (!allowed) {
    retryAfter = Math.ceil((resetAt - now) / 1000);
  }

  return {
    allowed,
    count: weightedCount,
    limit: maxRequests,
    remaining,
    retryAfter,
    resetAt
  };
}

export async function peekSlidingWindow(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<WindowResult> {
  const now = Date.now();
  const currentBucket = Math.floor(now / windowMs);
  const prevBucket = currentBucket - 1;

  const currentStr = await store.get(`rl:${key}:${currentBucket}`);
  const prevStr = await store.get(`rl:${key}:${prevBucket}`);

  const currentCount = currentStr ? parseInt(currentStr, 10) : 0;
  const prevCount = prevStr ? parseInt(prevStr, 10) : 0;

  const timeInCurrentWindow = now % windowMs;
  const overlap = (windowMs - timeInCurrentWindow) / windowMs;
  const weightedCount = currentCount + Math.floor(prevCount * overlap);

  return {
    allowed: weightedCount < maxRequests,
    count: weightedCount,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - weightedCount),
    resetAt: (currentBucket + 1) * windowMs
  };
}
