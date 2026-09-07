import type { APIRoute } from 'astro';
import { z } from 'zod';
import { errorResponse, jsonResponse } from '../../../lib/server/db';
import { HttpError, readJson } from '../../../lib/server/guards';
import { findGiftCard, formatGiftExpiry, giftCardExpired } from '../../../lib/server/giftcards';
import { rateLimit } from '../../../lib/server/ratelimit';

export const prerender = false;
const schema = z.object({ code: z.string().min(1).max(32) });

export const POST: APIRoute = async (context) => {
  const env = context.locals.runtime.env;
  try {
    const { data, ip } = await readJson(context.request, env, schema);
    if (!(await rateLimit(env, 'gift-check', ip, 10, 60))) return errorResponse('Too many requests', 429);
    const card = await findGiftCard(env, data.code);
    if (!card || card.disabled) return jsonResponse({ valid: false, balanceCents: 0, last4: null, expiresAt: null, expired: false });
    if (giftCardExpired(card)) return jsonResponse({ valid: false, expired: true, balanceCents: 0, last4: card.code_last4, expiresAt: formatGiftExpiry(card.expires_at as string) });
    return jsonResponse({ valid: true, expired: false, balanceCents: Math.max(0, card.balance_cents - card.reserved_cents), last4: card.code_last4, expiresAt: card.expires_at ? formatGiftExpiry(card.expires_at) : null });
  } catch (error) {
    return error instanceof HttpError ? errorResponse(error.message, error.status) : errorResponse('Unable to check gift card', 400);
  }
};
