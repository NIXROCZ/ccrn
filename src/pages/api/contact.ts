import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbRun, errorResponse, id, jsonResponse } from '../../lib/server/db';
import { HttpError, hashedIp, readJson, verifyTurnstile } from '../../lib/server/guards';
import { rateLimit } from '../../lib/server/ratelimit';
import { sendEmail } from '../../lib/server/resend';
import { contactRelayEmail } from '../../lib/email/templates';

export const prerender = false;
const schema = z.object({ name: z.string().trim().min(1).max(120), email: z.email(), topic: z.string().trim().min(1).max(80), message: z.string().trim().min(1).max(6000), website: z.string().optional(), turnstile: z.string().optional() });

export const POST: APIRoute = async (context) => {
  const env = context.locals.runtime.env;
  try {
    const { data, ip } = await readJson(context.request, env, schema);
    if (!(await rateLimit(env, 'contact', ip, 5, 60))) return errorResponse('Too many requests', 429);
    if (data.website) return jsonResponse({ ok: true });
    if (!(await verifyTurnstile(env, data.turnstile, ip))) return errorResponse('Verification failed', 400);
    await dbRun(env, 'INSERT INTO contact_messages (id, name, email, topic, message, ip_hash) VALUES (?, ?, ?, ?, ?, ?)', id(), data.name, data.email.toLowerCase(), data.topic, data.message, await hashedIp(env, ip));
    await sendEmail(env, { ...contactRelayEmail(data), to: env.CONTACT_TO_EMAIL });
    return jsonResponse({ ok: true });
  } catch (error) {
    return error instanceof HttpError ? errorResponse(error.message, error.status) : errorResponse('Unable to send message', 400);
  }
};
