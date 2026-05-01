import { useEffect, useRef, useState } from 'react';
import type { RequestRecord } from '../../../../server/src/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MAX_DISPLAY = 150;

export function useLiveFeed() {
  const [entries, setEntries] = useState<RequestRecord[]>([]);
  const [connected, setConnected] = useState(false);
  const [abuseEvents, setAbuseEvents] = useState<any[]>([]);
  const pausedRef = useRef(false);

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/stream`);

    es.addEventListener('open', () => setConnected(true));
    es.addEventListener('error', () => setConnected(false));

    es.addEventListener('request', (event) => {
      if (pausedRef.current) return;
      try {
        const record = JSON.parse((event as MessageEvent).data) as RequestRecord;
        setEntries((prev) => [record, ...prev].slice(0, MAX_DISPLAY));
      } catch {
        // ignore invalid payloads
      }
    });

    es.addEventListener('abuse', (event) => {
      try {
        const abuse = JSON.parse((event as MessageEvent).data);
        setAbuseEvents((prev) => [abuse, ...prev].slice(0, 50));
      } catch {
        // ignore invalid payloads
      }
    });

    return () => es.close();
  }, []);

  return {
    entries,
    connected,
    abuseEvents,
    setPaused: (paused: boolean) => {
      pausedRef.current = paused;
    }
  };
}
