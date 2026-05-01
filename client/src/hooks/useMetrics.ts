import { useEffect, useState } from 'react';
import { api } from '../utils/api';

interface Metrics {
  total: number;
  allowed: number;
  throttled: number;
  blocked: number;
  flagged: number;
  uniqueIPs: number;
  requestsPerSecond: number;
  usingFallback: boolean;
}

const DEFAULT_METRICS: Metrics = {
  total: 0,
  allowed: 0,
  throttled: 0,
  blocked: 0,
  flagged: 0,
  uniqueIPs: 0,
  requestsPerSecond: 0,
  usingFallback: false
};

export function useMetrics(intervalMs = 3000) {
  const [metrics, setMetrics] = useState<Metrics>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function pull() {
      try {
        const data = await api<Metrics>('/api/admin/metrics');
        if (active) {
          setMetrics(data);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    }

    pull();
    const timer = setInterval(pull, intervalMs);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return { metrics, loading };
}
