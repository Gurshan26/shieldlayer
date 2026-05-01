import { FormEvent, useState } from 'react';
import Button from '../../components/shared/Button';
import { useQuotas } from '../../hooks/useQuotas';
import styles from './Quotas.module.css';

const TIERS = ['free', 'basic', 'pro', 'enterprise'] as const;

export default function Quotas() {
  const { keys, create } = useQuotas();
  const [label, setLabel] = useState('');
  const [tier, setTier] = useState<typeof TIERS[number]>('free');
  const [created, setCreated] = useState<string>('');

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    const key = await create(label.trim(), tier);
    setCreated(key.key);
    setLabel('');
  }

  return (
    <div className={styles.page}>
      <h1>Quota Management</h1>
      <p className={styles.sub}>Manage API keys by tier. New keys are shown once on creation.</p>

      <form className={styles.form} onSubmit={onCreate}>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className={styles.input}
          placeholder="Team key label"
        />
        <select value={tier} onChange={(event) => setTier(event.target.value as any)} className={styles.input}>
          {TIERS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <Button type="submit">Create API Key</Button>
      </form>

      {created ? (
        <div className={styles.created}>
          New API key. Copy it now, it is only shown once: <span className="mono">{created}</span>
        </div>
      ) : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Label</th>
              <th>Key</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Requests</th>
              <th>Blocked</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key.key + key.createdAt}>
                <td>{key.label}</td>
                <td className="mono">{key.key}</td>
                <td><span className={`${styles.tier} ${styles[key.tier]}`}>{key.tier}</span></td>
                <td>{key.active ? 'Active' : 'Disabled'}</td>
                <td>{key.requestCount.toLocaleString('en-AU')}</td>
                <td>{key.blockedCount.toLocaleString('en-AU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
