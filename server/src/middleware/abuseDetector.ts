import { NextFunction, Request, Response } from 'express';
import { analyseRequest } from '../services/abuseEngine';
import { isBlocked } from '../services/ipBlocklist';
import { requestLogger } from './requestLogger';

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '127.0.0.1';
}

const INTERNAL_BYPASS_PREFIXES = [
  '/health',
  '/api/admin',
  '/api/blocklist',
  '/api/quotas',
  '/api/simulate',
  '/api/analytics',
  '/api/stream'
];

export function abuseDetector() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (INTERNAL_BYPASS_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
      return next();
    }

    const ip = getClientIP(req);

    if (await isBlocked(ip)) {
      return next();
    }

    res.on('finish', async () => {
      try {
        const requestId = String(res.getHeader('X-Request-ID') || '');
        const recentLogs = await requestLogger.getRecent(40);
        const thisReq = recentLogs.find((log) => log.id === requestId) || recentLogs.find((log) => log.ip === ip && log.endpoint === req.path);
        if (!thisReq) return;

        const { abuseFlags, shouldAutoBlock } = await analyseRequest(thisReq);
        if (abuseFlags.length > 0) {
          requestLogger.emit('abuse', {
            ip,
            flags: abuseFlags,
            autoBlocked: shouldAutoBlock,
            requestId: thisReq.id
          });
        }
      } catch {
        // Best effort. Never break request path.
      }
    });

    next();
  };
}
