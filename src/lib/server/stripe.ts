import type { Env } from '../../env';

const STRIPE_API = 'https://api.stripe.com/v1';
const STRIPE_VERSION = '2025-08-27.basil';

function appendForm(form: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendForm(form, `${key}[${index}]`, item));
  } else if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([child, childValue]) => appendForm(form, `${key}[${child}]`, childValue));
  } else {
    form.set(key, String(value));
  }
}

export async function stripeRequest<T>(env: Env, path: string, params: Record<string, unknown> = {}, method = 'POST'): Promise<T> {
  const form = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => appendForm(form, key, value));
  const response = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Stripe-Version': STRIPE_VERSION,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: method === 'GET' ? undefined : form,
  });
  const data = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? `Stripe request failed (${response.status})`);
  return data;
}

export type StripeCheckoutSession = {
  id: string;
  url?: string;
  payment_status?: string;
  customer_details?: { email?: string; address?: { country?: string } };
  payment_intent?: string | { id: string };
  metadata?: Record<string, string>;
  client_reference_id?: string;
};

export async function createCheckoutSession(env: Env, params: Record<string, unknown>): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>(env, '/checkout/sessions', params);
}

export async function retrieveCheckoutSession(env: Env, sessionId: string): Promise<StripeCheckoutSession> {
  return stripeRequest<StripeCheckoutSession>(env, `/checkout/sessions/${encodeURIComponent(sessionId)}`, {}, 'GET');
}

export async function verifyStripeSignature(payload: string, signature: string, secret: string, toleranceSeconds = 300): Promise<boolean> {
  const values = signature.split(',').reduce<Record<string, string[]>>((result, part) => {
    const [key, value] = part.split('=');
    if (key && value) (result[key] ??= []).push(value);
    return result;
  }, {});
  const timestamp = Number(values.t?.[0]);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;
  const signed = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  for (const candidate of values.v1 ?? []) {
    const bytes = candidate.match(/.{1,2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? [];
    if (await crypto.subtle.verify('HMAC', key, new Uint8Array(bytes), new TextEncoder().encode(signed))) return true;
  }
  return false;
}
