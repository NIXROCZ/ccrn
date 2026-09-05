import { describe, expect, it, vi } from 'vitest';
import { hashGiftCode, normaliseGiftCode, reserveGiftCodes } from './giftcards';
import { rateLimit } from './ratelimit';
import { verifyStripeSignature } from './stripe';
import { appendLicence } from './zip-licence';
import { finalisePaidOrder, validateCart } from './orders';
import { POST as stripeWebhook } from '../../pages/api/webhooks/stripe';

const bytes = (value: Uint8Array): ReadableStream<Uint8Array> => new Response(value.buffer as ArrayBuffer).body as ReadableStream<Uint8Array>;
const u16 = (value: number) => new Uint8Array([value & 255, value >>> 8]);
const u32 = (value: number) => new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, value >>> 24]);
const concat = (...chunks: Uint8Array[]) => { const output = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0)); let offset = 0; chunks.forEach((chunk) => { output.set(chunk, offset); offset += chunk.length; }); return output; };
const read16 = (bytes: Uint8Array, offset: number) => bytes[offset] | (bytes[offset + 1] << 8);
const read32 = (bytes: Uint8Array, offset: number) => (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;

function zipFixture(): Uint8Array {
  const name = new TextEncoder().encode('hello.txt');
  const data = new TextEncoder().encode('hello');
  const local = concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u32(0), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data);
  const central = concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(0), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(0), name);
  const eocd = concat(u32(0x06054b50), u16(0), u16(0), u16(1), u16(1), u32(central.length), u32(local.length), u16(0));
  return concat(local, central, eocd);
}

function zipEntryNames(bytes: Uint8Array): string[] {
  let eocd = bytes.length - 22;
  while (eocd >= 0 && read32(bytes, eocd) !== 0x06054b50) eocd -= 1;
  if (eocd < 0) throw new Error('EOCD not found');
  const count = read16(bytes, eocd + 10);
  const centralOffset = read32(bytes, eocd + 16);
  const names: string[] = [];
  let offset = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (read32(bytes, offset) !== 0x02014b50) throw new Error('central directory not found');
    const nameLength = read16(bytes, offset + 28);
    const extraLength = read16(bytes, offset + 30);
    const commentLength = read16(bytes, offset + 32);
    names.push(new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength)));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return names;
}

describe('server helpers', () => {
  it('normalises and hashes gift codes', async () => {
    expect(normaliseGiftCode(' abcd1-efgh2 ')).toBe('ABCD1EFGH2');
    expect(await hashGiftCode({ SITE_PEPPER: 'pepper' }, 'abcd1-efgh2')).toHaveLength(64);
  });

  it('verifies a constructed Stripe signature', async () => {
    const payload = '{"id":"evt_test"}';
    const timestamp = Math.floor(Date.now() / 1000);
    const secret = 'whsec_test';
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
    const signature = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    expect(await verifyStripeSignature(payload, `t=${timestamp},v1=${signature}`, secret)).toBe(true);
  });

  it('enforces a KV sliding window', async () => {
    const values = new Map<string, string>();
    const env = { SITE_PEPPER: 'pepper', KV: { get: async (key: string, type?: string) => { const value = values.get(key) ?? null; return type === 'json' && value ? JSON.parse(value) : value; }, put: async (key: string, value: string) => { values.set(key, value); } } };
    vi.spyOn(Date, 'now').mockReturnValue(100000);
    expect(await rateLimit(env, 'test', 'ip', 2, 60)).toBe(true);
    expect(await rateLimit(env, 'test', 'ip', 2, 60)).toBe(true);
    expect(await rateLimit(env, 'test', 'ip', 2, 60)).toBe(false);
    vi.restoreAllMocks();
  });

  it('appends a licence entry to a stored ZIP', async () => {
    const fixture = zipFixture();
    const bucket = { get: async (_key: string, options?: { range?: { offset: number; length: number } | { suffix: number } }) => {
      const value = options?.range && 'suffix' in options.range
        ? fixture.slice(Math.max(0, fixture.length - options.range.suffix))
        : options?.range
          ? 'offset' in options.range
            ? fixture.slice(options.range.offset, options.range.offset + options.range.length)
            : fixture
          : fixture;
      return { size: fixture.length, body: bytes(value) };
    } };
    const output = await appendLicence(bucket, 'kit.zip', 'Personal licence');
    const result = new Uint8Array(await new Response(output.body).arrayBuffer());
    expect(zipEntryNames(result)).toEqual(['hello.txt', 'LICENCE.txt']);
    expect(new TextDecoder().decode(result)).toContain('Personal licence');
  });

  it('rejects unavailable kits and gift-on-gift carts', () => {
    expect(() => validateCart({ kits: ['missing'], gifts: [], giftCodes: [], email: 'a@example.com' })).toThrow('not available');
    expect(() => validateCart({ kits: [], gifts: [{ amountCents: 3500 }], giftCodes: ['CODE'], email: 'a@example.com' })).toThrow('cannot be used');
  });
});

type FakeState = {
  giftCards: Array<{ id: string; code_hash: string; code_last4: string; balance_cents: number; reserved_cents: number; disabled: number; purchaser_email: string }>;
  redemptions: Array<{ id: string; gift_card_id: string; order_id: string; amount_cents: number; status: string }>;
  orders: Array<Record<string, unknown>>;
  grants: Array<Record<string, unknown>>;
  stripeEvents: Set<string>;
};

function fakeEnv(state: FakeState, fetchMock = vi.fn(async (...args: unknown[]) => { void args; return new Response('{}', { status: 200 }); })) {
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async first<T>() {
              if (sql.includes('FROM gift_cards')) {
                return state.giftCards.find((card) => card.code_hash === args[0]) as T | undefined ?? null;
              }
              if (sql.includes('FROM stripe_events')) return state.stripeEvents.has(String(args[0])) ? ({ id: args[0] } as T) : null;
              if (sql.includes('FROM orders')) return state.orders.find((order) => order.id === args[0]) as T | undefined ?? null;
              return null;
            },
            async all<T>() {
              if (sql.includes('FROM gift_redemptions')) return { results: state.redemptions.filter((row) => row.order_id === args[0] && row.status === args[1]) as T[] };
              return { results: [] as T[] };
            },
            async run() {
              let changes = 0;
              if (sql.startsWith('UPDATE gift_cards SET reserved_cents = reserved_cents +')) {
                const [amount, cardId, minimum] = args as number[] | string[];
                const card = state.giftCards.find((row) => row.id === cardId);
                if (card && !card.disabled && card.balance_cents - card.reserved_cents >= Number(minimum)) {
                  card.reserved_cents += Number(amount);
                  changes = 1;
                }
              } else if (sql.startsWith('INSERT INTO gift_redemptions')) {
                const [id, gift_card_id, order_id, amount_cents, status] = args as string[];
                state.redemptions.push({ id, gift_card_id, order_id, amount_cents: Number(amount_cents), status });
                changes = 1;
              } else if (sql.startsWith('UPDATE gift_cards SET reserved_cents = MAX')) {
                const [reserved, balance, cardId] = args as number[] | string[];
                const card = state.giftCards.find((row) => row.id === cardId);
                if (card) {
                  card.reserved_cents = Math.max(0, card.reserved_cents - Number(reserved));
                  if (sql.includes('balance_cents = MAX')) card.balance_cents = Math.max(0, card.balance_cents - Number(balance));
                  changes = 1;
                }
              } else if (sql.startsWith('UPDATE gift_redemptions')) {
                const [status, cardId, orderId, oldStatus] = args as string[];
                state.redemptions.filter((row) => row.gift_card_id === cardId && row.order_id === orderId && row.status === oldStatus).forEach((row) => { row.status = status; changes += 1; });
              } else if (sql.startsWith('UPDATE orders SET status = ?')) {
                const order = state.orders.find((row) => row.id === args[3] && row.status === args[4]);
                if (order) {
                  order.status = args[0];
                  order.billing_country = args[1];
                  order.stripe_payment_intent = args[2];
                  if (sql.includes('paid_at')) order.paid_at = 'now';
                  changes = 1;
                }
              } else if (sql.startsWith('INSERT OR IGNORE INTO download_grants')) {
                const [id, order_id, customer_email, kit_id] = args as string[];
                if (!state.grants.some((grant) => grant.order_id === order_id && grant.kit_id === kit_id)) {
                  state.grants.push({ id, order_id, customer_email, kit_id });
                  changes = 1;
                }
              } else if (sql.startsWith('INSERT INTO stripe_events')) {
                const eventId = String(args[0]);
                if (!state.stripeEvents.has(eventId)) {
                  state.stripeEvents.add(eventId);
                  changes = 1;
                }
              }
              return { success: true, meta: { changes } };
            },
          };
        },
      };
    },
  };
  const values = new Map<string, string>();
  const env = {
    DB: db,
    KV: {
      get: async (key: string, type?: string) => {
        const value = values.get(key) ?? null;
        return type === 'json' && value ? JSON.parse(value) : value;
      },
      put: async (key: string, value: string) => { values.set(key, value); },
      delete: async (key: string) => { values.delete(key); },
    },
    SITE_PEPPER: 'pepper',
    SYNC_TOKEN: 'sync',
    SITE_URL: 'https://raisingnoble.com',
    FROM_EMAIL: 'Raising Noble <orders@raisingnoble.com>',
    ORDERS_EMAIL: 'orders@raisingnoble.com',
    CONTACT_TO_EMAIL: 'hello@raisingnoble.com',
    STRIPE_SECRET_KEY: 'sk_test',
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
    RESEND_API_KEY: 're_test',
    DEPLOY_HOOK_URL: '',
    KITS: {},
    CATALOGUE_KV: {},
  };
  vi.stubGlobal('fetch', fetchMock);
  return { env, fetchMock };
}

function pendingOrder(id: string, items = { kits: ['seedoils'], gifts: [], giftCodes: [] }) {
  return { id, order_number: 'RN-TEST01', customer_email: 'buyer@example.com', status: 'pending', stripe_session_id: null, stripe_payment_intent: null, currency: 'aud', kit_subtotal_cents: 3500, bundle_discount_cents: 0, gift_subtotal_cents: 0, gift_applied_cents: 0, total_cents: 3500, billing_country: null, items_json: JSON.stringify(items), paid_at: null };
}

function stateWithOrder(order = pendingOrder('order-1')): FakeState {
  return { giftCards: [], redemptions: [], orders: [order], grants: [], stripeEvents: new Set() };
}

describe('server fulfilment flows', () => {
  it('applies gift credit up to the order total', async () => {
    const state = stateWithOrder();
    const envResult = fakeEnv(state);
    const code = 'ABCDEFGH2J';
    state.giftCards.push({ id: 'card-1', code_hash: await hashGiftCode(envResult.env as never, code), code_last4: code.slice(-4), balance_cents: 1500, reserved_cents: 0, disabled: 0, purchaser_email: 'giver@example.com' });
    const result = await reserveGiftCodes(envResult.env as never, [code], 3500, 'order-1');
    expect(result.appliedCents).toBe(1500);
    expect(result.reservations).toHaveLength(1);
  });

  it('fulfils an order only once when claims race', async () => {
    const state = stateWithOrder();
    const envResult = fakeEnv(state);
    const session = { id: 'cs_test', payment_status: 'paid', customer_details: { email: 'buyer@example.com', address: { country: 'AU' } }, payment_intent: 'pi_test', metadata: { order_id: 'order-1' } };
    await Promise.all([finalisePaidOrder(envResult.env as never, 'order-1', session), finalisePaidOrder(envResult.env as never, 'order-1', session)]);
    expect(state.orders[0].status).toBe('paid');
    expect(state.grants).toHaveLength(1);
    expect(envResult.fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refunds a non-Australian order once without grants', async () => {
    const state = stateWithOrder();
    const envResult = fakeEnv(state);
    const session = { id: 'cs_test', payment_status: 'paid', customer_details: { email: 'buyer@example.com', address: { country: 'US' } }, payment_intent: 'pi_test', metadata: { order_id: 'order-1' } };
    await Promise.all([finalisePaidOrder(envResult.env as never, 'order-1', session), finalisePaidOrder(envResult.env as never, 'order-1', session)]);
    expect(state.orders[0].status).toBe('refunded_non_au');
    expect(state.grants).toHaveLength(0);
    expect(envResult.fetchMock).toHaveBeenCalledTimes(2);
    expect(envResult.fetchMock.mock.calls[0]?.[0]).toContain('/v1/refunds');
  });

  it('deduplicates identical webhook events', async () => {
    const state = stateWithOrder();
    const envResult = fakeEnv(state);
    const body = JSON.stringify({ id: 'evt_test', type: 'checkout.session.completed', data: { object: { id: 'cs_test', payment_status: 'paid', customer_details: { email: 'buyer@example.com', address: { country: 'AU' } }, payment_intent: 'pi_test', metadata: { order_id: 'order-1' } } } });
    const timestamp = Math.floor(Date.now() / 1000);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('whsec_test'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`));
    const signature = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const context = () => ({ request: new Request('https://raisingnoble.com/api/webhooks/stripe', { method: 'POST', body, headers: { 'Stripe-Signature': `t=${timestamp},v1=${signature}`, 'CF-Connecting-IP': '127.0.0.1' } }), locals: { runtime: { env: envResult.env } } }) as never;
    expect((await stripeWebhook(context())).status).toBe(200);
    expect((await stripeWebhook(context())).status).toBe(200);
    expect(state.grants).toHaveLength(1);
    expect(envResult.fetchMock).toHaveBeenCalledTimes(1);
  });
});
