// scripts/record-demo.js
// Usage: node scripts/record-demo.js
// Requires: npm install puppeteer

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('ffmpeg-static');

const BASE_URL = process.env.DEMO_URL || 'http://localhost:5173';
const ASSETS_DIR = path.join(__dirname, '..', 'docs', 'assets');
const DELAY = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const HEADLESS = process.env.DEMO_HEADLESS !== '0';
const RECORD_VIDEO = process.env.DEMO_RECORD_VIDEO !== '0';

async function screenshot(page, name, label) {
  await page.screenshot({ path: path.join(ASSETS_DIR, `${name}.png`), fullPage: false });
  console.log(`Screenshot: ${label} -> docs/assets/${name}.png`);
}

async function run() {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  let recorder = null;

  if (RECORD_VIDEO) {
    if (!ffmpegPath) {
      console.warn('Video recording skipped. ffmpeg binary not available.');
    } else {
      recorder = await page.screencast({
        path: path.join(ASSETS_DIR, 'shieldlayer-demo.webm'),
        ffmpegPath,
        fps: 30
      });
      console.log('Video recording started: docs/assets/shieldlayer-demo.webm');
    }
  }

  try {
    await page.goto(`${BASE_URL}/`);
    await DELAY(2000);
    await screenshot(page, '01-dashboard', 'Dashboard overview');

    await page.goto(`${BASE_URL}/`);
    await DELAY(1500);
    await screenshot(page, '02-live-feed-empty', 'Live feed empty state');

    await page.goto(`${BASE_URL}/simulate`);
    await DELAY(1500);
    await screenshot(page, '03-simulate-page', 'Simulation page');

    await page.click('[data-scenario="burst"]');
    await DELAY(500);

    await page.click('[data-action="run-simulation"]');
    await DELAY(500);
    await screenshot(page, '04-simulation-running', 'Simulation in progress');

    await page.waitForSelector('[data-testid="simulation-results"]', { timeout: 45000 });
    await DELAY(1000);
    await screenshot(page, '05-simulation-results', 'Simulation results');

    await page.goto(`${BASE_URL}/`);
    await DELAY(2000);
    await screenshot(page, '06-dashboard-with-traffic', 'Dashboard after simulation');

    await page.goto(`${BASE_URL}/requests`);
    await DELAY(1500);
    await screenshot(page, '07-requests-table', 'Request log table');

    await page.goto(`${BASE_URL}/ip`);
    await DELAY(1500);
    await screenshot(page, '08-ip-management', 'IP blocklist/allowlist');

    await page.goto(`${BASE_URL}/alerts`);
    await DELAY(1500);
    await screenshot(page, '09-abuse-alerts', 'Abuse alerts panel');

    await page.goto(`${BASE_URL}/quotas`);
    await DELAY(1500);
    await screenshot(page, '10-quotas', 'API key quota management');

    console.log('\nAll screenshots saved to docs/assets/');
  } finally {
    if (recorder) {
      await recorder.stop();
      console.log('Video saved: docs/assets/shieldlayer-demo.webm');
    }

    await browser.close();
  }
}

run().catch(console.error);
