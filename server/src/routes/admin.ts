import { Router } from 'express';
import { requestLogger } from '../middleware/requestLogger';
import { getAbuseAlerts, resolveAlert } from '../services/abuseEngine';
import { isUsingFallback } from '../redis';

const router = Router();

router.get('/metrics', async (req, res) => {
  const windowMs = parseInt((req.query.window as string) || '60000', 10);
  const metrics = await requestLogger.getMetrics(windowMs);
  res.json({ ...metrics, usingFallback: isUsingFallback() });
});

router.get('/requests', async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '100', 10), 500);
  const logs = await requestLogger.getRecent(limit);
  res.json({ requests: logs, total: logs.length });
});

router.get('/alerts', async (_req, res) => {
  const alerts = await getAbuseAlerts(100);
  res.json({ alerts, unresolved: alerts.filter((alert) => !alert.resolved).length });
});

router.patch('/alerts/:id/resolve', async (req, res) => {
  const resolved = await resolveAlert(req.params.id);
  if (!resolved) return res.status(404).json({ error: 'Alert not found' });
  return res.json({ success: true });
});

export default router;
