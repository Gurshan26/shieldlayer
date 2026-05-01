import { NavLink } from 'react-router-dom';
import styles from './Sidebar.module.css';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/requests', label: 'Requests' },
  { to: '/ip', label: 'IP Management' },
  { to: '/quotas', label: 'Quotas' },
  { to: '/alerts', label: 'Abuse Alerts' },
  { to: '/simulate', label: 'Simulate' }
];

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>ShieldLayer</div>
      <div className={styles.sub}>Gateway Protection</div>

      <nav className={styles.nav}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.statusBox}>
        <div className={styles.statusTitle}>Status</div>
        <div className={styles.statusRow}><span className={styles.dotOk} /> Monitoring live traffic</div>
        <div className={styles.statusRow}><span className={styles.dotWarn} /> Abuse engine active</div>
      </div>
    </aside>
  );
}
