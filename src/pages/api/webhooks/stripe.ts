import type { APIRoute } from 'astro';
import { dbFirst, dbRun, errorResponse, jsonResponse } from '../../../lib/server/db';
import { verifyStripeSignature, type StripeCheckoutSession } from '../../../lib/server/stripe';
import { expireOrder, finalisePaidOrder } from '../../../lib/server/orders';
import { rateLimit } from '../../../lib/server/ratelimit';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const env = context.locals.runtime.env;
  const body = await context.request.text();
  const signature = context.request.headers.get('Stripe-Signature') ?? '';
  if (!(await rateLimit(env, 'stripe-webhook', context.request.headers.get('CF-Connecting-IP') ?? 'unknown', 120, 60))) return errorResponse('Too many requests', 429);
  if (!(await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET))) return errorResponse('Invalid signature', 400);
  let event: { id: string; type: string; data?: { object?: StripeCheckoutSession } };
  try { event = JSON.parse(body) as typeof event; } catch { return errorResponse('Invalid event', 400); }
  if (await dbFirst<{ id: string }>(env, 'SELECT id FROM stripe_events WHERE id = ?', event.id)) return jsonResponse({ received: true });
  await dbRun(env, 'INSERT INTO stripe_events (id, type) VALUES (?, ?)', event.id, event.type);
  const session = event.data?.object;
  const orderId = session?.metadata?.order_id ?? session?.client_reference_id;
  if (orderId) {
    if (event.type === 'checkout.session.completed' && session?.payment_status === 'paid') await finalisePaidOrder(env, orderId, session);
    else if (event.type === 'checkout.session.async_payment_succeeded') await finalisePaidOrder(env, orderId, session);
    else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') await expireOrder(env, orderId);
  }
  return jsonResponse({ received: true });
};
