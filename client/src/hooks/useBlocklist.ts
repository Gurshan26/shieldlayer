import { useEffect, useState } from 'react';
import { api } from '../utils/api';

export interface IPRecord {
  ip: string;
  status: 'allowed' | 'blocked' | 'flagged' | 'watching';
  reason?: string;
  lastSeen: number;
  autoBlocked: boolean;
}

export function useBlocklist() {
  const [records, setRecords] = useState<IPRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const data = await api<{ records: IPRecord[] }>('/api/blocklist');
    setRecords(data.records || []);
    setLoading(false);
  }

  async function block(ip: string, reason: string, permanent = false) {
    await api('/api/blocklist/block', {
      method: 'POST',
      body: { ip, reason, permanent }
    });
    await refresh();
  }

  async function allow(ip: string, reason?: string) {
    await api('/api/blocklist/allow', {
      method: 'POST',
      body: { ip, reason }
    });
    await refresh();
  }

  async function remove(ip: string) {
    await api(`/api/blocklist/${ip}`, { method: 'DELETE' });
    await refresh();
  }

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);

  return { records, loading, refresh, block, allow, remove };
}
