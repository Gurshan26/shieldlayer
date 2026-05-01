import { useEffect, useState } from 'react';
import type { RequestRecord } from '../../../../server/src/types';
import RequestTable from '../../components/RequestTable/RequestTable';
import { api } from '../../utils/api';
import styles from './Requests.module.css';

export default function Requests() {
  const [rows, setRows] = useState<RequestRecord[]>([]);

  useEffect(() => {
    let active = true;

    async function pull() {
      try {
        const data = await api<{ requests: RequestRecord[] }>('/api/admin/requests?limit=300');
        if (active) setRows(data.requests || []);
      } catch {
        if (active) setRows([]);
      }
    }

    pull();
    const timer = setInterval(pull, 3000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className={styles.page}>
      <h1>Request Log</h1>
      <p className={styles.sub}>Raw request stream with status and latency.</p>
      <RequestTable rows={rows} />
    </div>
  );
}
