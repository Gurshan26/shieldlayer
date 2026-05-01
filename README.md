# ShieldLayer — Rate Limiting + Abuse Detection

API gateway middleware with quotas, IP reputation, and a real-time admin console.
Point noisy traffic at it and watch it throttle, flag, and block.

## What it does

- Sliding window rate limiting with Redis buckets
- Per-IP and per-API-key quota enforcement
- IP blocklist and allowlist with auto-expiry
- Abuse detection for burst traffic, scanning, and stuffing patterns
- Live request feed over SSE
- Admin console for metrics, requests, alerts, IPs, and quotas
- Built-in spam simulation scenarios for demos

## Run it

```bash
# Optional but recommended
# Starts Redis on localhost:6379
docker-compose up -d redis

npm install
npm run dev
# Client: http://localhost:5173
# API: http://localhost:3001
```

If Redis is down, the server switches to in-memory mode automatically.
You can still demo everything. Data just resets on restart.

## Demo flow

1. Open `http://localhost:5173/simulate`
2. Run `Burst Attack`
3. Go to Dashboard and watch live traffic updates
4. Check Abuse Alerts and IP Management to see flagged and blocked IPs

## Tests

```bash
npm test
```

## Deploy

Set `REDIS_URL` to a free [Upstash](https://upstash.com) instance.
Deploy with `render.yaml` on Render.

## Architecture

```text
Client Request
  -> Rate Limiter (sliding window)
  -> Abuse Detector
  -> API route
  -> Request Logger + SSE stream
  -> Admin Console
```

## Screenshots

Run:

```bash
npm run demo:screenshots
```

Images are saved to `docs/assets/`.
