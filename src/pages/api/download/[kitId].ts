import type { APIRoute } from 'astro';
import { getKit } from '../../../lib/catalogue';
import { dbAll, dbFirst, dbRun, errorResponse } from '../../../lib/server/db';
import { clientIp, hashedIp } from '../../../lib/server/guards';
import { rateLimit } from '../../../lib/server/ratelimit';
import { sessionEmail, sessionTokenFromCookie } from '../../../lib/server/session';
import { appendLicence } from '../../../lib/server/zip-licence';

export const prerender = false;
const DOWNLOAD_CAP = 10;

export const GET: APIRoute = async ({ params, request, locals }) => {
  const env = locals.runtime.env;
  const kitId = params.kitId ?? '';
  const email = await sessionEmail(env, sessionTokenFromCookie(request.headers.get('Cookie')));
  if (!email) return errorResponse('Sign in required', 401);
  if (!(await rateLimit(env, 'download', clientIp(request), 30, 60))) return errorResponse('Too many requests', 429);
  if (!getKit(kitId)) return errorResponse('Kit not found', 404);
  const grant = await dbFirst<{ id: string; order_id: string; order_number: string }>(env, 'SELECT g.id, g.order_id, o.order_number FROM download_grants g JOIN orders o ON o.id = g.order_id WHERE g.customer_email = ? AND g.kit_id = ? AND g.revoked = 0 AND o.status = ?', email, kitId, 'paid');
  if (!grant) return errorResponse('Download not found', 404);
  const downloads = await dbAll<{ count: number }>(env, 'SELECT COUNT(*) as count FROM downloads WHERE grant_id = ? AND downloaded_at >= datetime("now", "-30 days")', grant.id);
  if ((downloads[0]?.count ?? 0) >= DOWNLOAD_CAP) return errorResponse('Download limit reached', 429);
  const key = `kits/${kitId}/kit.zip`;
  const archive = await env.KITS.get(key);
  /* The grant exists, so this customer has paid. A missing object means the ZIP
     has not been uploaded to R2 yet, which is our problem and not a 404 for
     them — say so plainly and keep their entitlement intact. */
  if (!archive) return errorResponse('This kit is not ready to download yet. Your purchase is safe and we have been alerted — please contact us if it is still unavailable tomorrow.', 503);
  const licence = `Raising Noble licence\n\nBuyer: ${email}\nOrder: ${grant.order_number}\nDownloaded: ${new Date().toISOString()}\n\nPersonal, single-household use only. Sharing files is not permitted.`;
  const result = await appendLicence(env.KITS, key, licence);
  await dbRun(env, 'INSERT INTO downloads (id, grant_id, ip_hash, user_agent) VALUES (?, ?, ?, ?)', crypto.randomUUID(), grant.id, await hashedIp(env, clientIp(request)), request.headers.get('User-Agent') ?? '');
  return new Response(result.body, { headers: { 'Content-Type': 'application/zip', 'Content-Length': String(result.size), 'Content-Disposition': `attachment; filename="${kitId}-kit.zip"` } });
};
