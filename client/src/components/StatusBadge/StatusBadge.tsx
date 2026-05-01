import { RequestStatus } from '../../../../server/src/types';
import styles from './StatusBadge.module.css';

const CONFIG: Record<RequestStatus, { label: string; className: string }> = {
  allowed: { label: 'ALLOWED', className: 'allowed' },
  throttled: { label: 'THROTTLED', className: 'throttled' },
  blocked: { label: 'BLOCKED', className: 'blocked' },
  flagged: { label: 'FLAGGED', className: 'flagged' }
};

interface Props {
  status: RequestStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const cfg = CONFIG[status];
  return (
    <span className={`${styles.badge} ${styles[cfg.className]} ${styles[size]}`} aria-label={`Status: ${cfg.label}`}>
      {cfg.label}
    </span>
  );
}
