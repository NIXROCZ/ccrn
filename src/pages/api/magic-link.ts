import type { APIRoute } from 'astro';
import { z } from 'zod';
import { errorResponse, jsonResponse, dbFirst } from '../../lib/server/db';
import { HttpError, readJson, verifyTurnstile } from '../../lib/server/guards';
import { rateLimit } from '../../lib/server/ratelimit';
import { createMagicLink } from '../../lib/server/session';
import { sendEmail } from '../../lib/server/resend';
import { magicLinkEmail } from '../../lib/email/templates';

export const prerender = false;
const schema = z.object({ email: z.email(), turnstile: z.string().optional() });

export const POST: APIRoute = async (context) => {
  const env = context.locals.runtime.env;
  try {
    const { data, ip } = await readJson(context.request, env, schema);
    if (!(await rateLimit(env, 'magic-link', ip, 5, 60))) return errorResponse('Too many requests', 429);
    if (!(await verifyTurnstile(env, data.turnstile, ip))) return errorResponse('Verification failed', 400);
    const email = data.email.toLowerCase();
    const grant = await dbFirst<{ id: string }>(env, 'SELECT id FROM download_grants WHERE customer_email = ? AND revoked = 0 LIMIT 1', email);
    if (grant) {
      const token = await createMagicLink(env, email);
      await sendEmail(env, { ...magicLinkEmail(`${env.SITE_URL}/downloads/verify?token=${encodeURIComponent(token)}`), to: email });
    }
    return jsonResponse({ ok: true });
  } catch (error) {
    return error instanceof HttpError ? errorResponse(error.message, error.status) : errorResponse('Unable to send link', 400);
  }
};
