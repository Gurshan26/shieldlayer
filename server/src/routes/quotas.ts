import { Router } from 'express';
import { createApiKey, getAllApiKeys, revokeApiKey, updateApiKey } from '../services/quotaManager';
import { QuotaTier } from '../types';

const router = Router();
const VALID_TIERS: QuotaTier[] = ['free', 'basic', 'pro', 'enterprise'];

function maskKey(key: string): string {
  if (key.length < 8) return '********';
  return `${key.slice(0, 7)}...${'x'.repeat(8)}`;
}

router.get('/', async (_req, res) => {
  const records = await getAllApiKeys();
  const masked = records.map((record) => ({
    ...record,
    key: maskKey(record.key)
  }));
  res.json({ keys: masked, total: masked.length });
});

router.post('/', async (req, res) => {
  const { label, tier } = req.body || {};
  if (typeof label !== 'string' || label.trim().length < 2) {
    return res.status(400).json({ error: 'Label is required.' });
  }
  if (!VALID_TIERS.includes(tier)) {
    return res.status(400).json({ error: 'Invalid quota tier.' });
  }

  const record = await createApiKey(label.trim(), tier);
  return res.status(201).json({ key: record });
});

router.patch('/:key/tier', async (req, res) => {
  const { key } = req.params;
  const { tier } = req.body || {};

  if (!VALID_TIERS.includes(tier)) {
    return res.status(400).json({ error: 'Invalid quota tier.' });
  }

  const ok = await updateApiKey(key, { tier });
  if (!ok) return res.status(404).json({ error: 'API key not found.' });
  return res.json({ success: true });
});

router.patch('/:key/active', async (req, res) => {
  const { key } = req.params;
  const { active } = req.body || {};

  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: 'active must be true or false.' });
  }

  const ok = await updateApiKey(key, { active });
  if (!ok) return res.status(404).json({ error: 'API key not found.' });
  return res.json({ success: true });
});

router.delete('/:key', async (req, res) => {
  const { key } = req.params;
  const removed = await revokeApiKey(key);
  if (!removed) return res.status(404).json({ error: 'API key not found.' });
  return res.json({ success: true });
});

export default router;
