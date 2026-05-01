import { Router } from 'express';
import { allowlistIP, blockIP, getAllIPRecords, removeIPRecord } from '../services/ipBlocklist';

const router = Router();
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

function isValidIPv4(ip: string): boolean {
  if (!IP_REGEX.test(ip)) return false;
  return ip.split('.').every((part) => {
    const n = Number(part);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

router.get('/', async (_req, res) => {
  const records = await getAllIPRecords();
  records.sort((a, b) => b.lastSeen - a.lastSeen);
  res.json({ records, total: records.length });
});

router.post('/block', async (req, res) => {
  const { ip, reason, permanent } = req.body || {};
  if (typeof ip !== 'string' || !isValidIPv4(ip)) {
    return res.status(400).json({ error: 'Invalid IPv4 address.' });
  }
  if (typeof reason !== 'string' || reason.trim().length < 3) {
    return res.status(400).json({ error: 'Reason is required.' });
  }

  const record = await blockIP(ip, reason.trim(), Boolean(permanent));
  return res.json({ success: true, record });
});

router.post('/allow', async (req, res) => {
  const { ip, reason } = req.body || {};
  if (typeof ip !== 'string' || !isValidIPv4(ip)) {
    return res.status(400).json({ error: 'Invalid IPv4 address.' });
  }

  const record = await allowlistIP(ip, typeof reason === 'string' ? reason : undefined);
  return res.json({ success: true, record });
});

router.delete('/:ip', async (req, res) => {
  const { ip } = req.params;
  if (!isValidIPv4(ip)) {
    return res.status(400).json({ error: 'Invalid IPv4 address.' });
  }

  const removed = await removeIPRecord(ip);
  if (!removed) return res.status(404).json({ error: 'IP record not found.' });
  return res.json({ success: true });
});

export default router;
