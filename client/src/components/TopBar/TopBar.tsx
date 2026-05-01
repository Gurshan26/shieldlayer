import styles from './TopBar.module.css';

interface Props {
  requestsLast60s: number;
  activeAlerts: number;
  usingFallback: boolean;
}

export default function TopBar({ requestsLast60s, activeAlerts, usingFallback }: Props) {
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <strong>Live Gateway</strong>
        <span className={styles.meta}>{requestsLast60s} requests in last 60s</span>
      </div>
      <div className={styles.right}>
        {usingFallback ? <span className={styles.warn}>Using in-memory store. Data resets on restart.</span> : null}
        <span className={styles.alerts}>Active alerts: {activeAlerts}</span>
      </div>
    </header>
  );
}
