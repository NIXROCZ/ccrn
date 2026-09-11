import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbRun, errorResponse, id, jsonResponse, sha256 } from '../../lib/server/db';
import { HttpError, readJson, verifyTurnstile } from '../../lib/server/guards';
import { rateLimit } from '../../lib/server/ratelimit';
import { sendEmail } from '../../lib/server/resend';
import { newsletterConfirmEmail } from '../../lib/email/templates';

export const prerender = false;
const schema = z.object({ email: z.email(), turnstile: z.string().optional() });
const token = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const POST: APIRoute = async (context) => {
  const env = context.locals.runtime.env;
  try {
    const { data, ip } = await readJson(context.request, env, schema);
    if (!(await rateLimit(env, 'newsletter', ip, 5, 60))) return errorResponse('Too many requests', 429);
    if (!(await verifyTurnstile(env, data.turnstile, ip))) return errorResponse('Verification failed', 400);
    const email = data.email.toLowerCase();
    const confirm = token();
    const unsub = token();
    await dbRun(env, 'INSERT INTO subscribers (id, email, status, confirm_token_hash, unsub_token_hash) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET status = ?, confirm_token_hash = ?, unsub_token_hash = ?', id(), email, 'pending', await sha256(`${env.SITE_PEPPER}:${confirm}`), await sha256(`${env.SITE_PEPPER}:${unsub}`), 'pending', await sha256(`${env.SITE_PEPPER}:${confirm}`), await sha256(`${env.SITE_PEPPER}:${unsub}`));
    await sendEmail(env, { ...newsletterConfirmEmail(`${env.SITE_URL}/api/newsletter/confirm?token=${encodeURIComponent(confirm)}`), to: email });
    return jsonResponse({ ok: true });
  } catch (error) {
    return error instanceof HttpError ? errorResponse(error.message, error.status) : errorResponse('Unable to subscribe', 400);
  }
};

export const _internals = { token };
