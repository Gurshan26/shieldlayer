'use client';

import { useRef, useState } from 'react';
import StatusBadge from '../StatusBadge/StatusBadge';
import { useLiveFeed } from '../../hooks/useLiveFeed';
import styles from './LiveFeed.module.css';

export default function LiveFeed() {
  const [paused, setPaused] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const { entries, connected, pendingCount, setPaused: setHookPaused } = useLiveFeed();

  function updatePaused(next: boolean) {
    setPaused(next);
    setHookPaused(next);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.dot} data-connected={connected} />
          <span className={styles.title}>Live Request Feed</span>
          {connected ? <span className={styles.badge}>{entries.length} entries</span> : null}
        </div>
        <button className={`${styles.pauseBtn} ${paused ? styles.paused : ''}`} onClick={() => updatePaused(!paused)}>
          {paused ? `Resume${pendingCount ? ` (${pendingCount} new)` : ''}` : 'Pause'}
        </button>
      </div>

      <div className={styles.feed} ref={listRef}>
        {entries.length === 0 ? (
          <div className={styles.empty}>
            Waiting for requests. Run a simulation or hit a demo endpoint to see traffic.
          </div>
        ) : (
          entries.map((entry, index) => (
            <div
              key={`${entry.id}-${index}`}
              className={`${styles.entry} ${styles[entry.requestStatus]} animate-in`}
              style={{ animationDelay: `${Math.min(index * 10, 100)}ms` }}
            >
              <span className={`${styles.entryTime} mono`}>
                {new Date(entry.timestamp).toLocaleTimeString('en-AU', { hour12: false })}
              </span>
              <span className={`${styles.entryIp} mono`}>{entry.ip}</span>
              <span className={`${styles.entryMethod} mono`}>{entry.method}</span>
              <span className={`${styles.entryEndpoint} mono`}>{entry.endpoint}</span>
              <StatusBadge status={entry.requestStatus} />
              <span className={`${styles.entryCode} mono`}>{entry.statusCode}</span>
              <span className={`${styles.entryTime2} mono`}>{entry.responseTimeMs}ms</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
