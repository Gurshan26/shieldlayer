import { useEffect, useRef, useState } from 'react';
import type { RequestRecord } from '../../../../server/src/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const MAX_DISPLAY = 150;
const FEED_SEED_KEY = 'shieldlayer_feed_seed';

function recordKey(record: RequestRecord): string {
  return `${record.id}:${record.timestamp}`;
}

function mergeRecords(current: RequestRecord[], incoming: RequestRecord[]): RequestRecord[] {
  if (incoming.length === 0) return current;
  const seen = new Set(current.map(recordKey));
  const uniqueIncoming = incoming.filter((record) => !seen.has(recordKey(record)));
  return [...uniqueIncoming, ...current].slice(0, MAX_DISPLAY);
}

export function useLiveFeed() {
  const [entries, setEntries] = useState<RequestRecord[]>([]);
  const [connected, setConnected] = useState(false);
  const [abuseEvents, setAbuseEvents] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const pausedRef = useRef(false);
  const pendingRef = useRef<RequestRecord[]>([]);
  const pullLatestRef = useRef<() => Promise<void>>(async () => {});

  function flushPending() {
    if (pendingRef.current.length === 0) return;
    const pending = [...pendingRef.current].reverse();
    pendingRef.current = [];
    setPendingCount(0);
    setEntries((prev) => mergeRecords(prev, pending));
  }

  function loadSeededRecords(): RequestRecord[] {
    try {
      const raw = localStorage.getItem(FEED_SEED_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed as RequestRecord[];
    } catch {
      return [];
    }
  }

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/stream`);

    es.addEventListener('open', () => setConnected(true));
    es.addEventListener('error', () => setConnected(false));

    es.addEventListener('request', (event) => {
      try {
        const record = JSON.parse((event as MessageEvent).data) as RequestRecord;
        if (pausedRef.current) {
          pendingRef.current.push(record);
          if (pendingRef.current.length > MAX_DISPLAY) {
            pendingRef.current = pendingRef.current.slice(-MAX_DISPLAY);
          }
          setPendingCount(pendingRef.current.length);
          return;
        }
        setEntries((prev) => mergeRecords(prev, [record]));
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

  useEffect(() => {
    const seeded = loadSeededRecords();
    if (seeded.length > 0) {
      setEntries((prev) => mergeRecords(prev, seeded));
    }

    function onSeededFeed() {
      const records = loadSeededRecords();
      if (records.length === 0 || pausedRef.current) return;
      setEntries((prev) => mergeRecords(prev, records));
    }

    window.addEventListener('shieldlayer-feed-seed', onSeededFeed);
    return () => window.removeEventListener('shieldlayer-feed-seed', onSeededFeed);
  }, []);

  useEffect(() => {
    let active = true;

    async function pullLatest() {
      try {
        const response = await fetch(`${API_BASE}/api/admin/requests?limit=${MAX_DISPLAY}`);
        if (!response.ok) return;
        const data = await response.json();
        const requests = Array.isArray(data?.requests) ? (data.requests as RequestRecord[]) : [];
        if (!active || pausedRef.current || requests.length === 0) return;
        setEntries((prev) => mergeRecords(prev, requests));
      } catch {
        // keep SSE as the primary path; polling is fallback
      }
    }

    pullLatestRef.current = pullLatest;
    pullLatest();
    const interval = setInterval(pullLatest, 2500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return {
    entries,
    connected,
    abuseEvents,
    pendingCount,
    setPaused: (paused: boolean) => {
      const wasPaused = pausedRef.current;
      pausedRef.current = paused;
      if (wasPaused && !paused) {
        flushPending();
        pullLatestRef.current().catch(() => {});
      }
    }
  };
}
