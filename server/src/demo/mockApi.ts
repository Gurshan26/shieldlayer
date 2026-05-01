import { Router } from 'express';

const router = Router();

router.get('/users', (_req, res) => res.json({ users: [{ id: 1, name: 'Test User' }] }));
router.get('/products', (_req, res) => res.json({ products: [{ id: 1, price: 99.99 }] }));
router.get('/search', (_req, res) => res.json({ results: [], query: 'test' }));
router.get('/data', (_req, res) => res.json({ data: 'ok' }));
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === 'admin' && password === 'demo') {
    return res.json({ token: 'demo-token' });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});
router.get('/protected', (req, res) => {
  if (!req.headers['x-api-key']) {
    return res.status(403).json({ error: 'API key required' });
  }
  return res.json({ message: 'Access granted', timestamp: Date.now() });
});

export default router;
