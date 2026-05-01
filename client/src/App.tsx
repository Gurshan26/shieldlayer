import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar/Sidebar';
import TopBar from './components/TopBar/TopBar';
import { useMetrics } from './hooks/useMetrics';
import AbuseAlerts from './pages/AbuseAlerts/AbuseAlerts';
import Dashboard from './pages/Dashboard/Dashboard';
import IPManagement from './pages/IPManagement/IPManagement';
import Quotas from './pages/Quotas/Quotas';
import Requests from './pages/Requests/Requests';
import Simulate from './pages/Simulate/Simulate';
import { api } from './utils/api';
import styles from './App.module.css';

export default function App() {
  const { metrics } = useMetrics();
  const [activeAlerts, setActiveAlerts] = useState(0);

  useEffect(() => {
    let active = true;

    async function pullAlerts() {
      try {
        const data = await api<{ unresolved: number }>('/api/admin/alerts');
        if (active) setActiveAlerts(data.unresolved || 0);
      } catch {
        if (active) setActiveAlerts(0);
      }
    }

    pullAlerts();
    const timer = setInterval(pullAlerts, 4000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className={styles.app}>
      <Sidebar />
      <div className={styles.main}>
        <TopBar
          requestsLast60s={metrics.total}
          activeAlerts={activeAlerts}
          usingFallback={metrics.usingFallback}
        />
        <div className={styles.content}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/ip" element={<IPManagement />} />
            <Route path="/quotas" element={<Quotas />} />
            <Route path="/alerts" element={<AbuseAlerts />} />
            <Route path="/simulate" element={<Simulate />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
