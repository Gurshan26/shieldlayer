import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { checkSlidingWindow } from '../services/slidingWindow';
import { getQuotaForKey, incrementApiKeyUsage } from '../services/quotaManager';
import { getIPRecord, isAllowlisted, isBlocked, updateIPStats } from '../services/ipBlocklist';
import { RequestRecord, QuotaTier } from '../types';
import { requestLogger } from './requestLogger';

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 30;
const INTERNAL_BYPASS_PREFIXES = [
  '/health',
  '/api/admin',
  '/api/blocklist',
  '/api/quotas',
  '/api/simulate',
  '/api/analytics',
  '/api/stream'
];

function extractAPIKey(req: Request): string | undefined {
  const header = req.headers['x-api-key'];
  if (typeof header === 'string') return header;

  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }

  return undefined;
}

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '127.0.0.1';
}

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : undefined;
}

export function rateLimiter() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    const startTime = Date.now();
    const ip = getClientIP(req);
    const apiKey = extractAPIKey(req);
    const requestId = uuidv4().slice(0, 8);

    if (INTERNAL_BYPASS_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
      res.set('X-Request-ID', requestId);
      return next();
    }

    if (await isAllowlisted(ip)) {
      return next();
    }

    if (await isBlocked(ip)) {
      const record = await getIPRecord(ip);
      const retryAfter = record?.expiresAt
        ? Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000))
        : 3600;

      const reqRecord: RequestRecord = {
        id: requestId,
        timestamp: Date.now(),
        ip,
        method: req.method,
        endpoint: req.path,
        statusCode: 403,
        requestStatus: 'blocked',
        apiKey,
        userAgent: getUserAgent(req),
        responseTimeMs: Date.now() - startTime
      };

      await requestLogger.log(reqRecord);

      res.set('Retry-After', String(retryAfter));
      res.set('X-Request-ID', requestId);

      return res.status(403).json({
        error: 'This IP is blocked for suspicious activity.',
        retryAfter,
        requestId
      });
    }

    let windowMs = DEFAULT_WINDOW_MS;
    let maxRequests = DEFAULT_MAX_REQUESTS;
    let tier: QuotaTier | undefined;

    if (apiKey) {
      const quota = await getQuotaForKey(apiKey);
      if (!quota) {
        res.set('X-Request-ID', requestId);
        return res.status(401).json({ error: 'Invalid API key.', requestId });
      }
      windowMs = 60_000;
      maxRequests = quota.rpm;
      tier = quota.tier;
    }

    const limitKey = apiKey ? `key:${apiKey}` : `ip:${ip}`;
    const windowResult = await checkSlidingWindow(limitKey, windowMs, maxRequests);

    res.set({
      'X-RateLimit-Limit': String(maxRequests),
      'X-RateLimit-Remaining': String(windowResult.remaining),
      'X-RateLimit-Reset': String(Math.ceil(windowResult.resetAt / 1000)),
      'X-RateLimit-Window': String(windowMs / 1000),
      'X-Request-ID': requestId
    });

    if (!windowResult.allowed) {
      res.set('Retry-After', String(windowResult.retryAfter));

      const reqRecord: RequestRecord = {
        id: requestId,
        timestamp: Date.now(),
        ip,
        method: req.method,
        endpoint: req.path,
        statusCode: 429,
        requestStatus: 'throttled',
        apiKey,
        tier,
        userAgent: getUserAgent(req),
        responseTimeMs: Date.now() - startTime,
        retryAfter: windowResult.retryAfter,
        requestsThisWindow: windowResult.count,
        windowLimit: maxRequests
      };

      await requestLogger.log(reqRecord);
      if (apiKey) await incrementApiKeyUsage(apiKey, true);

      return res.status(429).json({
        error: "429. You're sending too fast.",
        retryAfter: windowResult.retryAfter,
        resetAt: windowResult.resetAt,
        limit: maxRequests,
        requestId
      });
    }

    await updateIPStats(ip, {
      lastSeen: Date.now()
    }).catch(() => {});

    const originalSend = res.send.bind(res);
    res.send = (body?: any): Response => {
      const reqRecord: RequestRecord = {
        id: requestId,
        timestamp: Date.now(),
        ip,
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        requestStatus: 'allowed',
        apiKey,
        tier,
        userAgent: getUserAgent(req),
        responseTimeMs: Date.now() - startTime,
        requestsThisWindow: windowResult.count,
        windowLimit: maxRequests
      };

      requestLogger.log(reqRecord).catch(() => {});
      if (apiKey) incrementApiKeyUsage(apiKey, false).catch(() => {});

      return originalSend(body);
    };

    return next();
  };
}
