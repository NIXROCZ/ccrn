import type { APIRoute } from 'astro';
import { z } from 'zod';
import { errorResponse, jsonResponse } from '../../lib/server/db';
import { HttpError, readJson } from '../../lib/server/guards';
import { rateLimit } from '../../lib/server/ratelimit';
import { checkoutSession, createPendingOrder, type OrderItem } from '../../lib/server/orders';

export const prerender = false;
const schema = z.object({
  kits: z.array(z.string()).max(50),
  gifts: z.array(z.object({ amountCents: z.number(), recipientName: z.string().optional(), recipientEmail: z.string().email().optional(), message: z.string().max(1000).optional() })).max(20),
  giftCodes: z.array(z.string()).max(3),
  email: z.string().email(),
});

export const POST: APIRoute = async (context) => {
  const env = context.locals.runtime.env;
  try {
    const { data, ip } = await readJson(context.request, env, schema);
    if (!(await rateLimit(env, 'checkout', ip, 10, 60))) return errorResponse('Too many checkout attempts', 429);
    const { order, reservations } = await createPendingOrder(env, data as OrderItem);
    return jsonResponse(await checkoutSession(env, order, data as OrderItem, reservations));
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(error.message, error.status);
    return errorResponse(error instanceof Error ? error.message : 'Checkout could not be started', 409);
  }
};
