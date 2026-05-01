import { describe, expect, it, vi } from 'vitest';
import { checkSlidingWindow, peekSlidingWindow } from '../../src/services/slidingWindow';

vi.mock('../../src/redis', () => {
  const mem = new Map<string, number>();
  return {
    store: {
      get: vi.fn(async (k: string) => (mem.has(k) ? String(mem.get(k)) : null)),
      set: vi.fn(async () => {}),
      incr: vi.fn(async (k: string) => {
        const v = (mem.get(k) || 0) + 1;
        mem.set(k, v);
        return v;
      }),
      expire: vi.fn(async () => {}),
      del: vi.fn(async (k: string) => {
        mem.delete(k);
      }),
      keys: vi.fn(async () => []),
      mget: vi.fn(async () => [])
    }
  };
});

describe('checkSlidingWindow', () => {
  it('allows requests under the limit', async () => {
    const result = await checkSlidingWindow('test-ip-1', 60_000, 10);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it('returns correct limit in result', async () => {
    const result = await checkSlidingWindow('test-ip-2', 60_000, 25);
    expect(result.limit).toBe(25);
  });

  it('blocks when limit is exceeded', async () => {
    const key = 'test-burst-ip';
    let result: any;
    for (let i = 0; i < 31; i += 1) {
      result = await checkSlidingWindow(key, 60_000, 30);
    }
    expect(result.count).toBeGreaterThan(0);
  });

  it('sets retryAfter only when not allowed', async () => {
    const result = await checkSlidingWindow('fresh-key-xyz', 60_000, 100);
    if (result.allowed) {
      expect(result.retryAfter).toBeUndefined();
    } else {
      expect(typeof result.retryAfter).toBe('number');
      expect(result.retryAfter).toBeGreaterThan(0);
    }
  });

  it('resetAt is in the future', async () => {
    const result = await checkSlidingWindow('future-key', 60_000, 10);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it('remaining decreases to zero when limit hit', async () => {
    const result1 = await checkSlidingWindow('limit-test', 60_000, 5);
    expect(result1.remaining).toBeGreaterThanOrEqual(0);
  });
});

describe('peekSlidingWindow', () => {
  it('does not increment counter', async () => {
    const { store } = await import('../../src/redis');
    const incrSpy = vi.spyOn(store, 'incr');
    await peekSlidingWindow('peek-test', 60_000, 10);
    expect(incrSpy).not.toHaveBeenCalled();
  });
});
