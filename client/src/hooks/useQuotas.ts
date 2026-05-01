import { useEffect, useState } from 'react';
import { api } from '../utils/api';

export interface QuotaKey {
  key: string;
  label: string;
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  active: boolean;
  requestCount: number;
  blockedCount: number;
  createdAt: number;
  lastUsed?: number;
}

export function useQuotas() {
  const [keys, setKeys] = useState<QuotaKey[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const data = await api<{ keys: QuotaKey[] }>('/api/quotas');
    setKeys(data.keys || []);
    setLoading(false);
  }

  async function create(label: string, tier: QuotaKey['tier']) {
    const data = await api<{ key: QuotaKey }>('/api/quotas', {
      method: 'POST',
      body: { label, tier }
    });
    await refresh();
    return data.key;
  }

  async function setTier(key: string, tier: QuotaKey['tier']) {
    await api(`/api/quotas/${key}/tier`, {
      method: 'PATCH',
      body: { tier }
    });
    await refresh();
  }

  async function setActive(key: string, active: boolean) {
    await api(`/api/quotas/${key}/active`, {
      method: 'PATCH',
      body: { active }
    });
    await refresh();
  }

  async function revoke(key: string) {
    await api(`/api/quotas/${key}`, { method: 'DELETE' });
    await refresh();
  }

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  return { keys, loading, refresh, create, setTier, setActive, revoke };
}
