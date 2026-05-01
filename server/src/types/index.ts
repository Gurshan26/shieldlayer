export type RequestStatus = 'allowed' | 'throttled' | 'blocked' | 'flagged';

export type AbuseReason =
  | 'burst_attack'
  | 'endpoint_scanning'
  | 'credential_stuffing'
  | 'suspicious_user_agent'
  | 'distributed_flood'
  | 'repeated_4xx'
  | 'rate_limit_bypass_attempt';

export type QuotaTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  burstAllowance?: number;
}

export interface QuotaDefinition {
  tier: QuotaTier;
  rpm: number;
  rpd: number;
  burstAllowance: number;
  concurrentLimit: number;
}

export const QUOTA_TIERS: Record<QuotaTier, QuotaDefinition> = {
  free: { tier: 'free', rpm: 10, rpd: 100, burstAllowance: 2, concurrentLimit: 2 },
  basic: { tier: 'basic', rpm: 60, rpd: 1000, burstAllowance: 10, concurrentLimit: 5 },
  pro: { tier: 'pro', rpm: 300, rpd: 10000, burstAllowance: 30, concurrentLimit: 20 },
  enterprise: { tier: 'enterprise', rpm: 3000, rpd: 100000, burstAllowance: 100, concurrentLimit: 100 }
};

export interface RequestRecord {
  id: string;
  timestamp: number;
  ip: string;
  method: string;
  endpoint: string;
  statusCode: number;
  requestStatus: RequestStatus;
  apiKey?: string;
  tier?: QuotaTier;
  userAgent?: string;
  responseTimeMs: number;
  abuseFlags?: AbuseReason[];
  retryAfter?: number;
  requestsThisWindow?: number;
  windowLimit?: number;
}

export interface IPRecord {
  ip: string;
  status: 'allowed' | 'blocked' | 'flagged' | 'watching';
  addedAt: number;
  expiresAt?: number;
  reason?: string;
  requestCount: number;
  lastSeen: number;
  abuseScore: number;
  autoBlocked: boolean;
}

export interface AbuseAlert {
  id: string;
  ip: string;
  reason: AbuseReason;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  requestCount: number;
  windowMs: number;
  autoBlocked: boolean;
  resolved: boolean;
  details: string;
}

export interface ApiKeyRecord {
  key: string;
  label: string;
  tier: QuotaTier;
  active: boolean;
  createdAt: number;
  requestCount: number;
  blockedCount: number;
  lastUsed?: number;
}

export interface MetricsSnapshot {
  timestamp: number;
  totalRequests: number;
  allowedCount: number;
  throttledCount: number;
  blockedCount: number;
  flaggedCount: number;
  uniqueIPs: number;
  requestsPerSecond: number;
}
