import { formatNumber } from '../../utils/formatters';
import styles from './MetricCard.module.css';

interface Props {
  value: number | string | null;
  label: string;
  tone?: 'neutral' | 'allowed' | 'throttled' | 'blocked' | 'flagged';
  trend?: 'up' | 'down';
  trendValue?: string;
}

export default function MetricCard({ value, label, tone = 'neutral', trend, trendValue }: Props) {
  const printable =
    value === null ? '—' : typeof value === 'number' ? formatNumber(value) : value;

  return (
    <div className={`${styles.card} ${styles[tone]}`}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        {trend && trendValue ? (
          <span className={`${styles.trend} ${styles[trend]}`}>{trendValue}</span>
        ) : null}
      </div>
      <div className={styles.value}>{printable}</div>
    </div>
  );
}
