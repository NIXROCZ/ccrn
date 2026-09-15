import type { APIRoute } from 'astro';
import { dbAll, errorResponse, jsonResponse } from '../../lib/server/db';
import { availableKits } from '../../lib/catalogue';

export const prerender = false;

/**
 * Is this deployment actually wired up?
 *
 * A Worker with a missing secret or an empty bucket looks perfectly healthy
 * from the outside: pages render, the shop lists kits, nothing errors. The
 * failure surfaces at the worst possible moment — a customer pays, the webhook
 * signature check fails, and no email and no download ever arrive. This answers
 * the question in one request instead.
 *
 *   curl -s -H "Authorization: Bearer $SYNC_TOKEN" https://<host>/api/health | jq
 *
 * Authenticated, because an unauthenticated list of which secrets are unset
 * tells a stranger exactly where a store is soft. It reports presence only and
 * never a value, so the output is safe to paste into an email.
 */

/** Compare without leaking length or position through timing. */
function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    difference |= (a[index % (a.length || 1)] ?? 0) ^ (b[index % (b.length || 1)] ?? 0);
  }
  return difference === 0;
}

type Check = { ok: boolean; detail: string };

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;

  // With no SYNC_TOKEN set there is nothing to authenticate against, and that
  // is itself the finding — say so rather than opening the endpoint up.
  if (!env.SYNC_TOKEN) {
    return errorResponse('SYNC_TOKEN is not set on this Worker, so health cannot be checked. Set it first: wrangler secret put SYNC_TOKEN', 503);
  }
  const provided = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!constantTimeEqual(provided, env.SYNC_TOKEN)) return errorResponse('Unauthorized', 401);

  const checks: Record<string, Check> = {};

  // Secrets. Presence only — never the value, not even a prefix.
  const required = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY', 'SITE_PEPPER', 'SYNC_TOKEN'] as const;
  for (const name of required) {
    const set = typeof env[name] === 'string' && env[name].length > 0;
    checks[`secret:${name}`] = { ok: set, detail: set ? 'set' : 'MISSING — orders will fail silently' };
  }
  for (const name of ['TURNSTILE_SECRET_KEY', 'DEPLOY_HOOK_URL'] as const) {
    checks[`secret:${name}`] = { ok: true, detail: env[name] ? 'set' : 'not set (optional)' };
  }

  // Stripe keys carry their mode in the prefix, and shipping a test key to a
  // live domain is a silent way to take no money at all.
  const stripeMode = env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live'
    : env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test'
      : 'unrecognised';
  checks['stripe:mode'] = { ok: stripeMode !== 'unrecognised', detail: stripeMode };

  // D1: reachable, and carrying the migrations rather than just existing.
  try {
    const rows = await dbAll<{ name: string }>(env, 'SELECT name FROM d1_migrations ORDER BY id');
    const applied = rows.map((row) => row.name);
    const expected = ['0001_init.sql', '0002_gift_card_expiry.sql'];
    const missing = expected.filter((name) => !applied.includes(name));
    checks['d1'] = missing.length === 0
      ? { ok: true, detail: `reachable, ${applied.length} migrations applied` }
      : { ok: false, detail: `migrations not applied: ${missing.join(', ')} — run wrangler d1 migrations apply` };
  } catch (error) {
    checks['d1'] = { ok: false, detail: `unreachable: ${error instanceof Error ? error.message : 'unknown'}` };
  }

  // R2: the question the dashboard makes tedious — is every sellable kit
  // actually in the bucket? A kit on sale with no file is a 503 at someone who
  // has already paid.
  try {
    const sellable = availableKits().map((kit) => kit.id);
    const present: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await env.KITS.list({ prefix: 'kits/', cursor });
      for (const object of page.objects) {
        const match = /^kits\/([^/]+)\/kit\.zip$/.exec(object.key);
        if (match) present.push(match[1]);
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    const missing = sellable.filter((kitId) => !present.includes(kitId));
    checks['r2:kits'] = missing.length === 0
      ? { ok: true, detail: `all ${sellable.length} sellable kits present` }
      : { ok: false, detail: `${missing.length} of ${sellable.length} missing: ${missing.join(', ')}` };
  } catch (error) {
    checks['r2:kits'] = { ok: false, detail: `bucket unreachable: ${error instanceof Error ? error.message : 'unknown'}` };
  }

  // KV: a write and a read, because a binding that resolves is not the same as
  // a namespace that works.
  try {
    const probe = `health:${crypto.randomUUID()}`;
    await env.KV.put(probe, 'ok', { expirationTtl: 60 });
    const read = await env.KV.get(probe);
    await env.KV.delete(probe);
    checks['kv'] = { ok: read === 'ok', detail: read === 'ok' ? 'read and write ok' : 'wrote but could not read back' };
  } catch (error) {
    checks['kv'] = { ok: false, detail: `unusable: ${error instanceof Error ? error.message : 'unknown'}` };
  }

  // SITE_URL ends up in every emailed link, so a stale one sends buyers nowhere.
  const siteUrl = env.SITE_URL ?? '';
  const requestHost = new URL(request.url).host;
  const matches = siteUrl.includes(requestHost);
  checks['config:SITE_URL'] = {
    ok: matches,
    detail: matches ? siteUrl : `${siteUrl} does not match the host serving this request (${requestHost}) — emailed links will point at the wrong site`,
  };

  const failures = Object.entries(checks).filter(([, check]) => !check.ok).map(([name]) => name);
  return jsonResponse({ ok: failures.length === 0, failing: failures, checks }, { status: failures.length === 0 ? 200 : 503 });
};
