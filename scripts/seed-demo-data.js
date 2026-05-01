// scripts/seed-demo-data.js
// Seeds activity by triggering a burst simulation.

const API = process.env.API_URL || 'http://localhost:3001';

async function run() {
  const response = await fetch(`${API}/api/simulate/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario: 'burst' })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Seed failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  console.log('Seed complete:', data);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
