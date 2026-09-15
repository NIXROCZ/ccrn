import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbFirst, errorResponse, id, jsonResponse, sha256 } from '../../lib/server/db';
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
    /*
     * Never move an existing subscriber's status, and only refresh the tokens
     * of someone still pending.
     *
     * This used to set status back to 'pending' on every submission. Anyone who
     * knew an address could therefore knock a confirmed subscriber off the list
     * silently, and rotating the unsubscribe token broke the unsubscribe link in
     * every email already sent to them. It also re-mailed people who had
     * unsubscribed, which the Spam Act 2003 does not take kindly to.
     *
     * The returned status then decides whether an email is warranted at all:
     * only someone genuinely awaiting confirmation needs one. That also means an
     * address already on the list cannot be used to send itself mail.
     */
    const row = await dbFirst<{ status: string }>(
      env,
      `INSERT INTO subscribers (id, email, status, confirm_token_hash, unsub_token_hash)
       VALUES (?, ?, 'pending', ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         confirm_token_hash = CASE WHEN subscribers.status = 'pending' THEN excluded.confirm_token_hash ELSE subscribers.confirm_token_hash END,
         unsub_token_hash   = CASE WHEN subscribers.status = 'pending' THEN excluded.unsub_token_hash   ELSE subscribers.unsub_token_hash   END
       RETURNING status`,
      id(), email, await sha256(`${env.SITE_PEPPER}:${confirm}`), await sha256(`${env.SITE_PEPPER}:${unsub}`),
    );
    if (row?.status === 'pending') {
      await sendEmail(env, { ...newsletterConfirmEmail(`${env.SITE_URL}/api/newsletter/confirm?token=${encodeURIComponent(confirm)}`), to: email });
    }
    /* Always the same answer, so the endpoint cannot be used to discover who is
       already subscribed. */
    return jsonResponse({ ok: true });
  } catch (error) {
    return error instanceof HttpError ? errorResponse(error.message, error.status) : errorResponse('Unable to subscribe', 400);
  }
};

export const _internals = { token };
