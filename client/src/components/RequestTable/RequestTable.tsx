import { RequestRecord } from '../../../../server/src/types';
import StatusBadge from '../StatusBadge/StatusBadge';
import styles from './RequestTable.module.css';

interface Props {
  rows: RequestRecord[];
}

export default function RequestTable({ rows }: Props) {
  if (rows.length === 0) {
    return <div className={styles.empty}>No request logs yet.</div>;
  }

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Time</th>
            <th>IP</th>
            <th>Endpoint</th>
            <th>Status</th>
            <th>Code</th>
            <th>Latency</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id + row.timestamp}>
              <td className="mono">{new Date(row.timestamp).toLocaleTimeString('en-AU', { hour12: false })}</td>
              <td className="mono">{row.ip}</td>
              <td className="mono">{row.endpoint}</td>
              <td><StatusBadge status={row.requestStatus} /></td>
              <td className="mono">{row.statusCode}</td>
              <td className="mono">{row.responseTimeMs}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
