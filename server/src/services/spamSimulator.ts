import { v4 as uuidv4 } from 'uuid';
import { requestLogger } from '../middleware/requestLogger';
import { RequestRecord, RequestStatus } from '../types';
import { analyseRequest } from './abuseEngine';
import { isBlocked } from './ipBlocklist';
import { checkSlidingWindow } from './slidingWindow';

export type SimulationScenario = 'burst' | 'distributed' | 'scanning' | 'credential_stuffing';

const SCENARIOS: Record<
  SimulationScenario,
  {
    description: string;
    ips: string[];
    totalRequests: number;
    requestsPerMs: number;
    endpoints: string[];
    statusCodes: number[];
  }
> = {
  burst: {
    description: 'One IP sends 200 requests in 5 seconds',
    ips: ['198.51.100.1'],
    totalRequests: 200,
    requestsPerMs: 40,
    endpoints: ['/api/users', '/api/products'],
    statusCodes: [200, 200, 200, 429]
  },
  distributed: {
    description: 'Three IPs coordinate to flood the API',
    ips: ['198.51.100.10', '198.51.100.11', '198.51.100.12'],
    totalRequests: 150,
    requestsPerMs: 30,
    endpoints: ['/api/data', '/api/search'],
    statusCodes: [200, 429, 429]
  },
  scanning: {
    description: 'One IP scans 30 different endpoints in 60 seconds',
    ips: ['198.51.100.20'],
    totalRequests: 30,
    requestsPerMs: 2,
    endpoints: Array.from({ length: 30 }, (_, index) => `/api/endpoint-${index + 1}`),
    statusCodes: [404, 404, 200, 403]
  },
  credential_stuffing: {
    description: 'Bot attempts logins from one IP with high failure rate',
    ips: ['198.51.100.30'],
    totalRequests: 80,
    requestsPerMs: 10,
    endpoints: ['/api/auth/login'],
    statusCodes: [401, 401, 401, 403, 200]
  }
};

export async function runSimulation(scenario: SimulationScenario): Promise<{
  scenario: SimulationScenario;
  description: string;
  totalRequests: number;
  throttled: number;
  blocked: number;
  flagged: number;
  autoBlocked: string[];
  durationMs: number;
  records: RequestRecord[];
}> {
  const config = SCENARIOS[scenario];
  const startTime = Date.now();

  let throttled = 0;
  let blocked = 0;
  let flagged = 0;
  const autoBlocked = new Set<string>();
  const records: RequestRecord[] = [];

  for (let i = 0; i < config.totalRequests; i += 1) {
    const ip = config.ips[i % config.ips.length];
    const endpoint = config.endpoints[i % config.endpoints.length];
    const statusCode = config.statusCodes[i % config.statusCodes.length];

    if (await isBlocked(ip)) {
      blocked += 1;
      continue;
    }

    const rl = await checkSlidingWindow(`ip:${ip}`, 60_000, 30);

    let requestStatus: RequestStatus = 'allowed';
    if (!rl.allowed) {
      requestStatus = 'throttled';
      throttled += 1;
    }

    const record: RequestRecord = {
      id: uuidv4().slice(0, 8),
      timestamp: Date.now(),
      ip,
      method: 'GET',
      endpoint,
      statusCode: rl.allowed ? statusCode : 429,
      requestStatus,
      userAgent: scenario === 'scanning' ? 'nikto/2.1.6' : 'Mozilla/5.0',
      responseTimeMs: Math.floor(Math.random() * 50) + 5,
      requestsThisWindow: rl.count,
      windowLimit: 30
    };

    await requestLogger.log(record);
    records.unshift(record);
    if (records.length > 150) records.length = 150;

    const { abuseFlags, shouldAutoBlock } = await analyseRequest(record);
    if (abuseFlags.length > 0) {
      flagged += 1;
      if (shouldAutoBlock) autoBlocked.add(ip);
    }

    await new Promise((resolve) => setTimeout(resolve, Math.floor(1000 / config.requestsPerMs)));
  }

  return {
    scenario,
    description: config.description,
    totalRequests: config.totalRequests,
    throttled,
    blocked,
    flagged,
    autoBlocked: [...autoBlocked],
    durationMs: Date.now() - startTime,
    records
  };
}

export function getScenarios(): Array<{ key: SimulationScenario; description: string; totalRequests: number }> {
  return Object.entries(SCENARIOS).map(([key, value]) => ({
    key: key as SimulationScenario,
    description: value.description,
    totalRequests: value.totalRequests
  }));
}
