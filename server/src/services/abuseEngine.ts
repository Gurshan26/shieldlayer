import { v4 as uuidv4 } from 'uuid';
import { store } from '../redis';
import { AbuseAlert, AbuseReason, RequestRecord } from '../types';
import { autoBlockIP, flagIP } from './ipBlocklist';

const THRESHOLDS = {
  BURST_WINDOW_MS: 10_000,
  BURST_MAX_REQUESTS: 50,
  SCAN_WINDOW_MS: 30_000,
  SCAN_MIN_ENDPOINTS: 20,
  CRED_STUFF_WINDOW_MS: 60_000,
  CRED_STUFF_MIN_REQS: 20,
  CRED_STUFF_RATE: 0.3,
  REPEATED_4XX_COUNT: 15,
  REPEATED_4XX_WINDOW: 60_000,
  AUTO_BLOCK_THRESHOLD: 80
};

const SUSPICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /nmap/i,
  /zgrab/i,
  /python-requests/i,
  /go-http-client/i,
  /curl\//i,
  /scrapy/i,
  /wget/i,
  /dirbuster/i,
  /gobuster/i
];

const ALERTS_KEY = 'abuse:alerts';
const MAX_ALERTS = 500;

export async function analyseRequest(req: RequestRecord): Promise<{
  abuseFlags: AbuseReason[];
  abuseScore: number;
  shouldAutoBlock: boolean;
}> {
  const flags: AbuseReason[] = [];
  let score = 0;

  if (req.userAgent) {
    const suspicious = SUSPICIOUS_USER_AGENTS.some((pattern) => pattern.test(req.userAgent as string));
    if (suspicious) {
      flags.push('suspicious_user_agent');
      score += 30;
    }
  }

  const burstKey = `abuse:burst:${req.ip}`;
  const burstCount = await store.incr(burstKey);
  if (burstCount === 1) await store.expire(burstKey, THRESHOLDS.BURST_WINDOW_MS);
  if (burstCount > THRESHOLDS.BURST_MAX_REQUESTS) {
    flags.push('burst_attack');
    score += 50;
  }

  const scanKey = `abuse:scan:${req.ip}`;
  const scanData = await store.get(scanKey);
  const endpoints: Set<string> = scanData ? new Set(JSON.parse(scanData)) : new Set();
  endpoints.add(req.endpoint);
  await store.set(scanKey, JSON.stringify([...endpoints]), THRESHOLDS.SCAN_WINDOW_MS);
  if (endpoints.size >= THRESHOLDS.SCAN_MIN_ENDPOINTS) {
    flags.push('endpoint_scanning');
    score += 40;
  }

  if (req.statusCode === 401 || req.statusCode === 403) {
    const authFailKey = `abuse:authfail:${req.ip}`;
    const authTotalKey = `abuse:authtotal:${req.ip}`;

    const fails = await store.incr(authFailKey);
    const total = await store.incr(authTotalKey);

    if (fails === 1) await store.expire(authFailKey, THRESHOLDS.CRED_STUFF_WINDOW_MS);
    if (total === 1) await store.expire(authTotalKey, THRESHOLDS.CRED_STUFF_WINDOW_MS);

    if (total >= THRESHOLDS.CRED_STUFF_MIN_REQS && fails / total >= THRESHOLDS.CRED_STUFF_RATE) {
      flags.push('credential_stuffing');
      score += 60;
    }
  }

  if (req.statusCode >= 400 && req.statusCode < 500) {
    const errKey = `abuse:4xx:${req.ip}`;
    const errCount = await store.incr(errKey);
    if (errCount === 1) await store.expire(errKey, THRESHOLDS.REPEATED_4XX_WINDOW);
    if (errCount >= THRESHOLDS.REPEATED_4XX_COUNT) {
      flags.push('repeated_4xx');
      score += 25;
    }
  }

  const shouldAutoBlock = score >= THRESHOLDS.AUTO_BLOCK_THRESHOLD;

  if (flags.length > 0) {
    await saveAbuseAlert(req, flags, score, shouldAutoBlock);
    if (shouldAutoBlock) {
      await autoBlockIP(req.ip, flags.join(', '));
    } else {
      await flagIP(req.ip, flags.join(', '), score);
    }
  }

  return { abuseFlags: flags, abuseScore: score, shouldAutoBlock };
}

async function saveAbuseAlert(
  req: RequestRecord,
  flags: AbuseReason[],
  score: number,
  autoBlocked: boolean
): Promise<void> {
  const severity = score >= 80 ? 'critical' : score >= 50 ? 'high' : score >= 30 ? 'medium' : 'low';

  const alert: AbuseAlert = {
    id: uuidv4().slice(0, 8),
    ip: req.ip,
    reason: flags[0],
    severity,
    timestamp: Date.now(),
    requestCount: req.requestsThisWindow || 0,
    windowMs: 60_000,
    autoBlocked,
    resolved: false,
    details: `Flags: ${flags.join(', ')}. Score: ${score}/100. Endpoint: ${req.endpoint}.`
  };

  const raw = await store.get(ALERTS_KEY);
  const alerts: AbuseAlert[] = raw ? JSON.parse(raw) : [];
  alerts.unshift(alert);
  if (alerts.length > MAX_ALERTS) alerts.length = MAX_ALERTS;
  await store.set(ALERTS_KEY, JSON.stringify(alerts));
}

export async function getAbuseAlerts(limit = 50): Promise<AbuseAlert[]> {
  const raw = await store.get(ALERTS_KEY);
  if (!raw) return [];
  const all = JSON.parse(raw) as AbuseAlert[];
  return all.slice(0, limit);
}

export async function resolveAlert(id: string): Promise<boolean> {
  const raw = await store.get(ALERTS_KEY);
  if (!raw) return false;
  const alerts = JSON.parse(raw) as AbuseAlert[];
  const idx = alerts.findIndex((alert) => alert.id === id);
  if (idx === -1) return false;
  alerts[idx].resolved = true;
  await store.set(ALERTS_KEY, JSON.stringify(alerts));
  return true;
}
