import type { Env } from '../../env';

import { availableKits, getKit } from '../catalogue';
import { formatAud, priceCart, type Cart } from '../pricing';
import { createGiftCard, applyReservations, releaseReservations, reserveGiftCodes } from './giftcards';
import { dbAll, dbFirst, dbRun, id, orderNumber } from './db';
import { createCheckoutSession, stripeRequest, type StripeCheckoutSession } from './stripe';
import { sendEmail } from './resend';
import { giftCardEmail, orderReceiptEmail, simpleNoticeEmail } from '../email/templates';

export type OrderItem = Cart & { email: string };
export type OrderRow = {
  id: string; order_number: string; customer_email: string; status: string; stripe_session_id?: string | null;
  stripe_payment_intent?: string | null; currency: string; kit_subtotal_cents: number; bundle_discount_cents: number;
  gift_subtotal_cents: number; gift_applied_cents: number; total_cents: number; billing_country?: string | null;
  items_json: string; paid_at?: string | null;
};

function emailAddress(email: string): string {
  return email.trim().toLowerCase();
}

export function cleanCart(input: OrderItem): OrderItem {
  const kits = [...new Set(input.kits)];
  const gifts = input.gifts.map((gift) => ({ ...gift, amountCents: Math.round(gift.amountCents) }));
  return { ...input, email: emailAddress(input.email), kits, gifts, giftCodes: [...new Set(input.giftCodes)] };
}

export function validateCart(cart: OrderItem): { cart: OrderItem; totals: ReturnType<typeof priceCart>; kits: ReturnType<typeof availableKits> } {
  const clean = cleanCart(cart);
  if (clean.kits.some((kitId) => !getKit(kitId) || getKit(kitId)?.status !== 'available')) throw new Error('One or more kits are not available');
  if (clean.gifts.some((gift) => !Number.isInteger(gift.amountCents) || gift.amountCents < 1000 || gift.amountCents > 50000)) throw new Error('Gift card amounts must be whole dollars between A$10 and A$500');
  if (clean.giftCodes.length > 3) throw new Error('You can apply up to three gift codes');
  if (clean.gifts.length > 0 && clean.giftCodes.length > 0) throw new Error('Gift cards cannot be used to buy gift cards');
  const kits = availableKits();
  const totals = priceCart(clean, kits.map((kit) => kit.id));
  return { cart: clean, totals, kits };
}

export async function createPendingOrder(env: Env, input: OrderItem): Promise<{ order: OrderRow; reservations: Awaited<ReturnType<typeof reserveGiftCodes>> | null }> {
  const { cart, totals } = validateCart(input);
  const orderId = id();
  const number = orderNumber();
  const payable = totals.total;
  await dbRun(env, 'INSERT INTO orders (id, order_number, customer_email, status, kit_subtotal_cents, bundle_discount_cents, gift_subtotal_cents, total_cents, items_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', orderId, number, cart.email, 'pending', totals.kitSubtotal, totals.bundleDiscount, totals.giftSubtotal, payable, JSON.stringify(cart));
  let reservations: Awaited<ReturnType<typeof reserveGiftCodes>> | null = null;
  try {
    if (cart.giftCodes.length > 0) reservations = await reserveGiftCodes(env, cart.giftCodes, payable, orderId);
    const order = await dbFirst<OrderRow>(env, 'SELECT * FROM orders WHERE id = ?', orderId);
    if (!order) throw new Error('Order could not be created');
    return { order, reservations };
  } catch (error) {
    await dbRun(env, 'UPDATE orders SET status = ? WHERE id = ?', 'expired', orderId);
    throw error;
  }
}

function lineItems(cart: Cart, totals: ReturnType<typeof priceCart>): Record<string, unknown>[] {
  const kitPrice = totals.isBundle ? Math.round(3500 * 0.7) : 3500;
  return [
    ...cart.kits.map((kitId) => ({ price_data: { currency: 'aud', product_data: { name: getKit(kitId)?.title ?? kitId, description: totals.isBundle ? 'Complete bundle price' : undefined }, unit_amount: kitPrice }, quantity: 1 })),
    ...cart.gifts.map((gift) => ({ price_data: { currency: 'aud', product_data: { name: 'Raising Noble gift card' }, unit_amount: gift.amountCents }, quantity: 1 })),
  ];
}

export async function checkoutSession(env: Env, order: OrderRow, cart: OrderItem, reservations: Awaited<ReturnType<typeof reserveGiftCodes>> | null): Promise<{ url: string }> {
  const parsed = validateCart(cart);
  if (reservations && reservations.appliedCents > 0 && parsed.totals.total <= reservations.appliedCents) {
    await finalisePaidOrder(env, order.id, undefined);
    const token = await createOneTimeSuccessToken(env, order.customer_email, order.id);
    return { url: `${env.SITE_URL}/checkout/success?order=${encodeURIComponent(order.id)}&t=${encodeURIComponent(token)}` };
  }
  let coupon: { id: string } | undefined;
  if (reservations?.appliedCents) coupon = await stripeRequest<{ id: string }>(env, '/coupons', { duration: 'once', amount_off: reservations.appliedCents, currency: 'aud', max_redemptions: 1, name: `Gift card for ${order.order_number}` });
  const session = await createCheckoutSession(env, {
    mode: 'payment',
    line_items: lineItems(parsed.cart, parsed.totals),
    ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
    customer_email: order.customer_email,
    billing_address_collection: 'required',
    success_url: `${env.SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.SITE_URL}/checkout/cancelled?order=${encodeURIComponent(order.id)}`,
    expires_at: Math.floor(Date.now() / 1000) + 1800,
    client_reference_id: order.id,
    metadata: { order_id: order.id },
    payment_intent_data: { description: order.order_number },
  });
  await dbRun(env, 'UPDATE orders SET stripe_session_id = ?, gift_applied_cents = ?, total_cents = ? WHERE id = ?', session.id, reservations?.appliedCents ?? 0, Math.max(0, parsed.totals.total - (reservations?.appliedCents ?? 0)), order.id);
  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return { url: session.url };
}

async function createOneTimeSuccessToken(env: Env, email: string, orderId: string): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await env.KV.put(`success:${token}`, JSON.stringify({ email, orderId }), { expirationTtl: 900 });
  return token;
}

export async function consumeSuccessToken(env: Env, token: string): Promise<{ email: string; orderId: string } | null> {
  const value = await env.KV.get(`success:${token}`, 'json') as { email?: string; orderId?: string } | null;
  if (!value?.email || !value.orderId) return null;
  await env.KV.delete(`success:${token}`);
  return { email: value.email, orderId: value.orderId };
}

export async function finalisePaidOrder(env: Env, orderId: string, session: StripeCheckoutSession | undefined): Promise<OrderRow | null> {
  const order = await dbFirst<OrderRow>(env, 'SELECT * FROM orders WHERE id = ?', orderId);
  if (!order || order.status === 'paid') return order;
  const cart = JSON.parse(order.items_json) as Cart;
  const country = session?.customer_details?.address?.country ?? order.billing_country ?? null;
  if (country && country !== 'AU') {
    const paymentIntent = typeof session?.payment_intent === 'string' ? session.payment_intent : session?.payment_intent?.id;
    if (paymentIntent) await stripeRequest(env, '/refunds', { payment_intent: paymentIntent });
    const reservations = await dbAll<{ gift_card_id: string; amount_cents: number }>(env, 'SELECT gift_card_id, amount_cents FROM gift_redemptions WHERE order_id = ? AND status = ?', orderId, 'reserved');
    await releaseReservations(env, reservations.map((row) => ({ cardId: row.gift_card_id, amountCents: row.amount_cents, code: '' })), orderId);
    await dbRun(env, 'UPDATE orders SET status = ?, billing_country = ?, stripe_payment_intent = ? WHERE id = ?', 'refunded_non_au', country, paymentIntent ?? null, orderId);
    await sendEmail(env, { ...simpleNoticeEmail('Your Raising Noble order was refunded', 'Orders are currently available in Australia only.'), to: order.customer_email }).catch(() => undefined);
    return dbFirst<OrderRow>(env, 'SELECT * FROM orders WHERE id = ?', orderId);
  }
  await applyReservations(env, orderId);
  const paymentIntent = typeof session?.payment_intent === 'string' ? session.payment_intent : session?.payment_intent?.id;
  await dbRun(env, 'UPDATE orders SET status = ?, billing_country = ?, stripe_payment_intent = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?', 'paid', country, paymentIntent ?? null, orderId);
  for (const kitId of cart.kits) {
    await dbRun(env, 'INSERT OR IGNORE INTO download_grants (id, order_id, customer_email, kit_id) VALUES (?, ?, ?, ?)', id(), orderId, order.customer_email, kitId);
  }
  for (const gift of cart.gifts) {
    const card = await createGiftCard(env, { amountCents: gift.amountCents, purchaserEmail: order.customer_email, recipientEmail: gift.recipientEmail, recipientName: gift.recipientName, message: gift.message, orderId });
    const recipient = gift.recipientEmail || order.customer_email;
    await sendEmail(env, { ...giftCardEmail({ code: card.displayCode, amount: formatAud(gift.amountCents), recipientName: gift.recipientName, message: gift.message }), to: recipient }).then(() => undefined).catch(() => undefined);
  }
  await sendEmail(env, { ...orderReceiptEmail({ orderNumber: order.order_number, email: order.customer_email, downloadUrl: `${env.SITE_URL}/downloads` }), to: order.customer_email }).catch(() => undefined);
  return dbFirst<OrderRow>(env, 'SELECT * FROM orders WHERE id = ?', orderId);
}

export async function expireOrder(env: Env, orderId: string): Promise<void> {
  const order = await dbFirst<OrderRow>(env, 'SELECT status FROM orders WHERE id = ?', orderId);
  if (!order || order.status === 'paid') return;
  const reservations = await dbAll<{ gift_card_id: string; amount_cents: number }>(env, 'SELECT gift_card_id, amount_cents FROM gift_redemptions WHERE order_id = ? AND status = ?', orderId, 'reserved');
  await releaseReservations(env, reservations.map((row) => ({ cardId: row.gift_card_id, amountCents: row.amount_cents, code: '' })), orderId);
  await dbRun(env, 'UPDATE orders SET status = ? WHERE id = ?', 'expired', orderId);
}
