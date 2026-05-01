import { useState } from 'react';
import { api } from '../../utils/api';
import styles from './Simulate.module.css';

const SCENARIOS = [
  {
    key: 'burst',
    label: 'Burst Attack',
    description: 'One IP sends 200 requests in about 5 seconds. Watch throttling kick in fast.',
    icon: '⚡',
    severity: 'high',
    totalRequests: 200
  },
  {
    key: 'distributed',
    label: 'Distributed Flood',
    description: 'Three coordinated IPs flood the API. Harder to catch than one source.',
    icon: '🌊',
    severity: 'high',
    totalRequests: 150
  },
  {
    key: 'scanning',
    label: 'Endpoint Scanning',
    description: 'A bot probes 30 endpoints quickly. Classic recon behavior.',
    icon: '🔍',
    severity: 'medium',
    totalRequests: 30
  },
  {
    key: 'credential_stuffing',
    label: 'Credential Stuffing',
    description: '80 login attempts from one IP with high failure rate.',
    icon: '🔐',
    severity: 'critical',
    totalRequests: 80
  }
] as const;

export default function Simulate() {
  const [selected, setSelected] = useState<(typeof SCENARIOS)[number]['key']>('burst');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function runSimulation() {
    setRunning(true);
    setError('');
    setResult(null);

    try {
      const data = await api('/api/simulate/run', {
        method: 'POST',
        body: { scenario: selected }
      });
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Simulation failed');
    } finally {
      setRunning(false);
    }
  }

  const scenario = SCENARIOS.find((item) => item.key === selected)!;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Spam Simulation</h1>
        <p className={styles.subtitle}>
          Pick a scenario, run it, and watch the dashboard react in real-time.
        </p>
      </div>

      <div className={styles.scenarios}>
        {SCENARIOS.map((item) => (
          <button
            key={item.key}
            data-scenario={item.key}
            className={`${styles.scenario} ${selected === item.key ? styles.selected : ''}`}
            onClick={() => setSelected(item.key)}
            data-severity={item.severity}
          >
            <span className={styles.icon}>{item.icon}</span>
            <div className={styles.scenarioText}>
              <span className={styles.scenarioLabel}>{item.label}</span>
              <span className={styles.scenarioDesc}>{item.description}</span>
            </div>
            <span className={styles.reqCount}>{item.totalRequests} requests</span>
          </button>
        ))}
      </div>

      <div className={styles.runSection}>
        <div className={styles.selectedInfo}>
          <strong>{scenario.icon} {scenario.label}</strong>
          <p>{scenario.description}</p>
        </div>

        <button
          className={`${styles.runBtn} ${running ? styles.running : ''}`}
          data-action="run-simulation"
          onClick={runSimulation}
          disabled={running}
        >
          {running ? (
            <>
              <span className={styles.spinner} /> Simulation running...
            </>
          ) : (
            `Run ${scenario.label} Simulation →`
          )}
        </button>

        {error ? <p className={styles.error}>{error}</p> : null}
      </div>

      {result ? (
        <div className={`${styles.results} animate-in`} data-testid="simulation-results">
          <h2>Simulation complete</h2>
          <div className={styles.resultGrid}>
            <div className={styles.resultCard}>
              <span className={styles.resultNum}>{result.totalRequests}</span>
              <span className={styles.resultLabel}>Total requests</span>
            </div>
            <div className={`${styles.resultCard} ${styles.throttledCard}`}>
              <span className={styles.resultNum}>{result.throttled}</span>
              <span className={styles.resultLabel}>Throttled</span>
            </div>
            <div className={`${styles.resultCard} ${styles.blockedCard}`}>
              <span className={styles.resultNum}>{result.blocked}</span>
              <span className={styles.resultLabel}>Blocked</span>
            </div>
            <div className={`${styles.resultCard} ${styles.flaggedCard}`}>
              <span className={styles.resultNum}>{result.flagged}</span>
              <span className={styles.resultLabel}>Flagged for abuse</span>
            </div>
          </div>

          {result.autoBlocked?.length > 0 ? (
            <div className={styles.autoblocked}>
              <span className={styles.autoBlockIcon}>🚨</span>
              <div>
                <strong>
                  {result.autoBlocked.length} IP{result.autoBlocked.length > 1 ? 's' : ''} auto-blocked
                </strong>
                <div className={styles.ips}>
                  {result.autoBlocked.map((ip: string) => (
                    <span key={ip} className={`${styles.ip} mono`}>{ip}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <p className={styles.hint}>
            Check the <strong>Live Feed</strong>, <strong>Abuse Alerts</strong>, and <strong>IP Management</strong> tabs.
          </p>
        </div>
      ) : null}
    </div>
  );
}
