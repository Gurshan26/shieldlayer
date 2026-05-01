import { EventEmitter } from 'events';
import { store } from '../redis';
import { RequestRecord } from '../types';

const LOG_KEY = 'requests:log';
const MAX_REQUESTS = 1000;

class RequestLogger extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0);
  }

  async log(record: RequestRecord): Promise<void> {
    const raw = await store.get(LOG_KEY);
    const logs: RequestRecord[] = raw ? JSON.parse(raw) : [];
    logs.unshift(record);
    if (logs.length > MAX_REQUESTS) logs.length = MAX_REQUESTS;
    await store.set(LOG_KEY, JSON.stringify(logs));
    this.emit('request', record);
  }

  async getRecent(limit = 100): Promise<RequestRecord[]> {
    const raw = await store.get(LOG_KEY);
    if (!raw) return [];
    const logs: RequestRecord[] = JSON.parse(raw);
    return logs.slice(0, limit);
  }

  async getAll(): Promise<RequestRecord[]> {
    const raw = await store.get(LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RequestRecord[];
  }

  async getMetrics(windowMs = 60_000): Promise<{
    total: number;
    allowed: number;
    throttled: number;
    blocked: number;
    flagged: number;
    uniqueIPs: number;
    requestsPerSecond: number;
  }> {
    const raw = await store.get(LOG_KEY);
    if (!raw) {
      return {
        total: 0,
        allowed: 0,
        throttled: 0,
        blocked: 0,
        flagged: 0,
        uniqueIPs: 0,
        requestsPerSecond: 0
      };
    }

    const now = Date.now();
    const logs: RequestRecord[] = JSON.parse(raw).filter((record: RequestRecord) => now - record.timestamp < windowMs);
    const uniqueIPs = new Set(logs.map((record) => record.ip));

    return {
      total: logs.length,
      allowed: logs.filter((record) => record.requestStatus === 'allowed').length,
      throttled: logs.filter((record) => record.requestStatus === 'throttled').length,
      blocked: logs.filter((record) => record.requestStatus === 'blocked').length,
      flagged: logs.filter((record) => record.requestStatus === 'flagged').length,
      uniqueIPs: uniqueIPs.size,
      requestsPerSecond: Math.round((logs.length / (windowMs / 1000)) * 10) / 10
    };
  }
}

export const requestLogger = new RequestLogger();
