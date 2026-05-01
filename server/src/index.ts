import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { abuseDetector } from './middleware/abuseDetector';
import { rateLimiter } from './middleware/rateLimiter';
import { initRedis, isUsingFallback } from './redis';
import adminRoutes from './routes/admin';
import analyticsRoutes from './routes/analytics';
import blocklistRoutes from './routes/blocklist';
import quotaRoutes from './routes/quotas';
import simulateRoutes from './routes/simulate';
import streamRoutes from './routes/stream';
import mockApiRoutes from './demo/mockApi';
import { seedDemoKeys } from './services/quotaManager';

const app = express();
const PORT = Number(process.env.PORT || 3001);
let bootstrapPromise: Promise<void> | null = null;

function ensureBootstrap(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    await initRedis();
    await seedDemoKeys();
  })();
  return bootstrapPromise;
}

const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const localDevOriginRegex = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (configuredOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (process.env.NODE_ENV !== 'production' && localDevOriginRegex.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    }
  })
);
app.use(express.json());
app.use(async (_req, _res, next) => {
  try {
    await ensureBootstrap();
    next();
  } catch (error) {
    next(error);
  }
});

app.use(rateLimiter());
app.use(abuseDetector());

app.use('/api/admin', adminRoutes);
app.use('/api/blocklist', blocklistRoutes);
app.use('/api/quotas', quotaRoutes);
app.use('/api/simulate', simulateRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/stream', streamRoutes);

app.use('/api/demo', mockApiRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    usingFallback: isUsingFallback(),
    ts: new Date().toISOString()
  });
});

let started = false;

export async function startServer(): Promise<void> {
  if (started) return;
  await ensureBootstrap();
  app.listen(PORT, () => {
    console.log(`ShieldLayer running on :${PORT}`);
    if (isUsingFallback()) {
      console.warn('Using in-memory fallback. Install Redis for persistence.');
    }
  });
  started = true;
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start server', err);
    process.exit(1);
  });
}

export default app;
