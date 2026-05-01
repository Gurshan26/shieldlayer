import { Router } from 'express';
import { requestLogger } from '../middleware/requestLogger';

const router = Router();

router.get('/timeline', async (req, res) => {
  const windowMs = parseInt((req.query.window as string) || '3600000', 10);
  const now = Date.now();
  const start = now - windowMs;
  const bucketMs = 60_000;

  const records = await requestLogger.getAll();
  const filtered = records.filter((record) => record.timestamp >= start && record.timestamp <= now);

  const buckets = new Map<number, { ts: number; total: number; allowed: number; throttled: number; blocked: number; flagged: number }>();

  for (let ts = start - (start % bucketMs); ts <= now; ts += bucketMs) {
    buckets.set(ts, {
      ts,
      total: 0,
      allowed: 0,
      throttled: 0,
      blocked: 0,
      flagged: 0
    });
  }

  for (const record of filtered) {
    const key = record.timestamp - (record.timestamp % bucketMs);
    const bucket = buckets.get(key);
    if (!bucket) continue;

    bucket.total += 1;
    if (record.requestStatus === 'allowed') bucket.allowed += 1;
    if (record.requestStatus === 'throttled') bucket.throttled += 1;
    if (record.requestStatus === 'blocked') bucket.blocked += 1;
    if (record.requestStatus === 'flagged') bucket.flagged += 1;
  }

  return res.json({
    windowMs,
    bucketMs,
    points: Array.from(buckets.values()).sort((a, b) => a.ts - b.ts)
  });
});

router.get('/top-ips', async (req, res) => {
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '10', 10), 1), 100);
  const records = await requestLogger.getAll();

  const counts = new Map<string, { ip: string; total: number; blocked: number; throttled: number }>();
  for (const record of records) {
    const entry = counts.get(record.ip) || { ip: record.ip, total: 0, blocked: 0, throttled: 0 };
    entry.total += 1;
    if (record.requestStatus === 'blocked') entry.blocked += 1;
    if (record.requestStatus === 'throttled') entry.throttled += 1;
    counts.set(record.ip, entry);
  }

  const top = Array.from(counts.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  return res.json({ items: top, total: top.length });
});

router.get('/top-endpoints', async (req, res) => {
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '10', 10), 1), 100);
  const records = await requestLogger.getAll();

  const counts = new Map<string, { endpoint: string; total: number; blocked: number; throttled: number; avgLatencyMs: number }>();

  for (const record of records) {
    const entry = counts.get(record.endpoint) || {
      endpoint: record.endpoint,
      total: 0,
      blocked: 0,
      throttled: 0,
      avgLatencyMs: 0
    };
    entry.total += 1;
    if (record.requestStatus === 'blocked') entry.blocked += 1;
    if (record.requestStatus === 'throttled') entry.throttled += 1;
    entry.avgLatencyMs += record.responseTimeMs;
    counts.set(record.endpoint, entry);
  }

  const top = Array.from(counts.values())
    .map((entry) => ({
      ...entry,
      avgLatencyMs: Math.round(entry.avgLatencyMs / Math.max(entry.total, 1))
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  return res.json({ items: top, total: top.length });
});

export default router;
