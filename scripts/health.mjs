/**
 * Ask a deployed Worker whether it is actually wired up.
 *
 *   SYNC_TOKEN=... npm run health -- https://raisingnoble.com
 *
 * Hits /api/health, which reports whether every secret is set, D1 carries its
 * migrations, KV reads back what it writes, SITE_URL matches the host, and —
 * the one the dashboard makes tedious — whether every sellable kit has a file
 * in R2. Presence only; no secret value is ever returned.
 */
const site = (process.argv[2] ?? process.env.SITE_URL ?? '').replace(/\/$/, '');
const token = process.env.SYNC_TOKEN;

if (!site || !token) {
  console.error('usage: SYNC_TOKEN=<token> node scripts/health.mjs https://your-site');
  process.exit(2);
}

const response = await fetch(`${site}/api/health`, { headers: { Authorization: `Bearer ${token}` } });
const body = await response.json().catch(() => null);

if (!body?.checks) {
  console.error(`${response.status} — ${typeof body?.error === 'string' ? body.error : 'no health payload returned'}`);
  process.exit(1);
}

for (const [name, check] of Object.entries(body.checks)) {
  console.log(`${check.ok ? '  ok   ' : '  FAIL '}${name.padEnd(30)} ${check.detail}`);
}
console.log('');
console.log(body.ok ? 'Everything this Worker can check is wired up.' : `Not ready: ${body.failing.join(', ')}`);
process.exit(body.ok ? 0 : 1);
