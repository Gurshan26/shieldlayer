import { useEffect, useState } from 'react';
import Button from '../../components/shared/Button';
import { api } from '../../utils/api';
import styles from './AbuseAlerts.module.css';

interface Alert {
  id: string;
  ip: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  autoBlocked: boolean;
  resolved: boolean;
  details: string;
}

export default function AbuseAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  async function refresh() {
    const data = await api<{ alerts: Alert[] }>('/api/admin/alerts');
    setAlerts(data.alerts || []);
  }

  async function resolve(id: string) {
    await api(`/api/admin/alerts/${id}/resolve`, { method: 'PATCH' });
    await refresh();
  }

  useEffect(() => {
    refresh().catch(() => setAlerts([]));
    const timer = setInterval(() => refresh().catch(() => {}), 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.page}>
      <h1>Abuse Alerts</h1>
      <p className={styles.sub}>Flagged activity from the abuse engine.</p>

      <div className={styles.list}>
        {alerts.length === 0 ? (
          <div className={styles.empty}>No suspicious activity in the last hour. Looking clean.</div>
        ) : (
          alerts.map((alert) => (
            <article key={alert.id} className={`${styles.card} ${styles[alert.severity]} ${alert.resolved ? styles.resolved : ''}`}>
              <div className={styles.row}>
                <strong className="mono">{alert.ip}</strong>
                <span className={styles.reason}>{alert.reason.replaceAll('_', ' ')}</span>
                <span className={styles.time}>{new Date(alert.timestamp).toLocaleString('en-AU')}</span>
              </div>
              <p className={styles.details}>{alert.details}</p>
              <div className={styles.row2}>
                <span>{alert.autoBlocked ? 'Auto-blocked' : 'Flagged only'}</span>
                {!alert.resolved ? (
                  <Button tone="ghost" onClick={() => resolve(alert.id)}>Resolve</Button>
                ) : (
                  <span className={styles.done}>Resolved</span>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
