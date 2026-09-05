import { describe, expect, it, vi } from 'vitest';
import { hashGiftCode, normaliseGiftCode } from './giftcards';
import { rateLimit } from './ratelimit';
import { verifyStripeSignature } from './stripe';
import { appendLicence } from './zip-licence';
import { validateCart } from './orders';

const bytes = (value: Uint8Array): ReadableStream<Uint8Array> => new Response(value.buffer as ArrayBuffer).body as ReadableStream<Uint8Array>;
const u16 = (value: number) => new Uint8Array([value & 255, value >>> 8]);
const u32 = (value: number) => new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, value >>> 24]);
const concat = (...chunks: Uint8Array[]) => { const output = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0)); let offset = 0; chunks.forEach((chunk) => { output.set(chunk, offset); offset += chunk.length; }); return output; };

function zipFixture(): Uint8Array {
  const name = new TextEncoder().encode('hello.txt');
  const data = new TextEncoder().encode('hello');
  const local = concat(u32(0x04034b50), u16(20), u16(0), u16(0), u32(0), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data);
  const central = concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u32(0), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(0), name);
  const eocd = concat(u32(0x06054b50), u16(0), u16(0), u16(1), u16(1), u32(central.length), u32(local.length), u16(0));
  return concat(local, central, eocd);
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
    const bucket = { get: async (_key: string, options?: { range?: { offset: number; length: number } }) => {
      const value = options?.range ? fixture.slice(options.range.offset, options.range.offset + options.range.length) : fixture;
      return { size: fixture.length, body: bytes(value) };
    } };
    const output = await appendLicence(bucket, 'kit.zip', 'Personal licence');
    const result = new Uint8Array(await new Response(output.body).arrayBuffer());
    const text = new TextDecoder().decode(result);
    expect(text).toContain('LICENCE.txt');
    expect(text).toContain('Personal licence');
  });

  it('rejects unavailable kits and gift-on-gift carts', () => {
    expect(() => validateCart({ kits: ['missing'], gifts: [], giftCodes: [], email: 'a@example.com' })).toThrow('not available');
    expect(() => validateCart({ kits: [], gifts: [{ amountCents: 3500 }], giftCodes: ['CODE'], email: 'a@example.com' })).toThrow('cannot be used');
  });
});
