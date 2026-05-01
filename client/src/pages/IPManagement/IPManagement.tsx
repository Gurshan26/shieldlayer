import { FormEvent, useMemo, useState } from 'react';
import Button from '../../components/shared/Button';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { useBlocklist } from '../../hooks/useBlocklist';
import { isValidIPv4 } from '../../utils/ipUtils';
import styles from './IPManagement.module.css';

export default function IPManagement() {
  const { records, block, allow, remove } = useBlocklist();
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('Manual action');
  const [error, setError] = useState('');

  const sorted = useMemo(() => [...records].sort((a, b) => b.lastSeen - a.lastSeen), [records]);

  async function onBlock(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!isValidIPv4(ip)) {
      setError('Please enter a valid IPv4 address.');
      return;
    }
    await block(ip, reason || 'Manual block');
    setIp('');
  }

  async function onAllow() {
    setError('');
    if (!isValidIPv4(ip)) {
      setError('Please enter a valid IPv4 address.');
      return;
    }
    await allow(ip, reason || 'Manual allowlist');
    setIp('');
  }

  return (
    <div className={styles.page}>
      <h1>IP Management</h1>
      <p className={styles.sub}>Block, allow, and clean up IP records.</p>

      <form className={styles.form} onSubmit={onBlock}>
        <input
          value={ip}
          onChange={(event) => setIp(event.target.value)}
          className={`${styles.input} mono`}
          placeholder="203.0.113.45"
        />
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={styles.input}
          placeholder="Reason"
        />
        <Button type="submit" tone="danger">Block IP</Button>
        <Button type="button" tone="primary" onClick={onAllow}>Allowlist IP</Button>
      </form>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>IP</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Last Seen</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((record) => (
              <tr key={record.ip}>
                <td className="mono">{record.ip}</td>
                <td>
                  <StatusBadge
                    status={record.status === 'watching' ? 'flagged' : (record.status as any)}
                  />
                </td>
                <td>{record.reason || 'No reason set'}</td>
                <td>{new Date(record.lastSeen).toLocaleString('en-AU')}</td>
                <td>
                  <Button tone="ghost" onClick={() => remove(record.ip)}>Remove</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
