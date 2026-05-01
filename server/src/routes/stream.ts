import { Request, Response, Router } from 'express';
import { requestLogger } from '../middleware/requestLogger';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.flushHeaders();
  res.write('event: ping\ndata: {}\n\n');

  function onRequest(record: unknown) {
    res.write(`event: request\ndata: ${JSON.stringify(record)}\n\n`);
  }

  function onAbuse(event: unknown) {
    res.write(`event: abuse\ndata: ${JSON.stringify(event)}\n\n`);
  }

  const keepAlive = setInterval(() => {
    res.write('event: ping\ndata: {}\n\n');
  }, 20_000);

  requestLogger.on('request', onRequest);
  requestLogger.on('abuse', onAbuse);

  req.on('close', () => {
    clearInterval(keepAlive);
    requestLogger.off('request', onRequest);
    requestLogger.off('abuse', onAbuse);
    res.end();
  });
});

export default router;
