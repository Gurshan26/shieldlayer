import { useEffect, useState } from 'react';
import LiveFeed from '../../components/LiveFeed/LiveFeed';
import MetricCard from '../../components/MetricCard/MetricCard';
import RateChart from '../../components/RateChart/RateChart';
import { useMetrics } from '../../hooks/useMetrics';
import { api } from '../../utils/api';
import styles from './Dashboard.module.css';

interface TimelinePoint {
  ts: number;
  total: number;
}

export default function Dashboard() {
  const { metrics } = useMetrics();
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);

  useEffect(() => {
    let active = true;
    async function pullTimeline() {
      try {
        const data = await api<{ points: TimelinePoint[] }>('/api/analytics/timeline?window=3600000');
        if (active) setTimeline(data.points || []);
      } catch {
        if (active) setTimeline([]);
      }
    }

    pullTimeline();
    const timer = setInterval(pullTimeline, 5000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Security Operations Dashboard</h1>
        <p>Live traffic, abuse signal, and throttle health in one place.</p>
      </div>

      <div className={styles.metrics}>
        <MetricCard label="Total Requests" value={metrics.total} tone="neutral" />
        <MetricCard label="Allowed" value={metrics.allowed} tone="allowed" />
        <MetricCard label="Throttled" value={metrics.throttled} tone="throttled" />
        <MetricCard label="Blocked" value={metrics.blocked} tone="blocked" />
        <MetricCard label="Flagged" value={metrics.flagged} tone="flagged" />
        <MetricCard label="Request Rate" value={`${metrics.requestsPerSecond.toFixed(1)} req/s`} tone="neutral" />
      </div>

      <div className={styles.grid}>
        <div className={styles.mainPanel}>
          <LiveFeed />
        </div>
        <div className={styles.sidePanel}>
          <RateChart points={timeline} />
        </div>
      </div>
    </div>
  );
}
