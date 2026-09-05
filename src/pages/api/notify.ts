import type { APIRoute } from 'astro';
import { z } from 'zod';
import { dbRun, errorResponse, id, jsonResponse } from '../../lib/server/db';
import { HttpError, readJson } from '../../lib/server/guards';
import { getKit } from '../../lib/catalogue';
import { rateLimit } from '../../lib/server/ratelimit';

export const prerender = false;
const schema = z.object({ email: z.string().email(), kitId: z.string().min(1).max(80) });

export const POST: APIRoute = async (context) => {
  const env = context.locals.runtime.env;
  try {
    const { data, ip } = await readJson(context.request, env, schema);
    if (!(await rateLimit(env, 'notify', ip, 10, 60))) return errorResponse('Too many requests', 429);
    if (!getKit(data.kitId)) return errorResponse('Kit not found', 404);
    await dbRun(env, 'INSERT INTO kit_notify (id, email, kit_id) VALUES (?, ?, ?) ON CONFLICT(email, kit_id) DO NOTHING', id(), data.email.toLowerCase(), data.kitId);
    return jsonResponse({ ok: true });
  } catch (error) {
    return error instanceof HttpError ? errorResponse(error.message, error.status) : errorResponse('Unable to save notification', 400);
  }
};
