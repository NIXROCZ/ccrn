import type { Env } from '../../env';

import { GIFT_VALIDITY_YEARS } from '../pricing';
import { dbAll, dbFirst, dbRun, id, sha256 } from './db';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export type GiftCardRow = { id: string; code_hash: string; code_last4: string; balance_cents: number; reserved_cents: number; disabled: number; purchaser_email: string; expires_at: string | null };
export type Reservation = { cardId: string; amountCents: number; code: string };

/** Three years from issue, as an ISO timestamp. */
export function giftCardExpiry(issuedAt: Date = new Date()): string {
  const expires = new Date(issuedAt.getTime());
  expires.setUTCFullYear(expires.getUTCFullYear() + GIFT_VALIDITY_YEARS);
  return expires.toISOString();
}

/** Cards issued before expiry dates existed carry NULL and never expire. */
export function giftCardExpired(card: { expires_at: string | null }, now: Date = new Date()): boolean {
  return card.expires_at !== null && Date.parse(card.expires_at) <= now.getTime();
}

export function formatGiftExpiry(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
}

export function normaliseGiftCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

export async function hashGiftCode(env: Pick<Env, 'SITE_PEPPER'>, code: string): Promise<string> {
  return sha256(`${env.SITE_PEPPER}:${normaliseGiftCode(code)}`);
}

export function generateGiftCode(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

export function displayGiftCode(code: string): string {
  const clean = normaliseGiftCode(code);
  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}

export async function findGiftCard(env: Env, code: string): Promise<GiftCardRow | null> {
  return dbFirst<GiftCardRow>(env, 'SELECT id, code_hash, code_last4, balance_cents, reserved_cents, disabled, purchaser_email, expires_at FROM gift_cards WHERE code_hash = ?', await hashGiftCode(env, code));
}

export async function reserveGiftCodes(env: Env, codes: string[], requiredCents: number, orderId: string): Promise<{ appliedCents: number; reservations: Reservation[] }> {
  const rows: (GiftCardRow & { code: string })[] = [];
  for (const code of codes) {
    const normalised = normaliseGiftCode(code);
    const card = await findGiftCard(env, code);
    if (!card || card.disabled) throw new Error(`Gift code ${normalised.slice(-4)} not recognised`);
    if (giftCardExpired(card)) throw new Error(`Gift code ${normalised.slice(-4)} expired on ${formatGiftExpiry(card.expires_at as string)}`);
    rows.push({ ...card, code: normalised });
  }
  rows.sort((a, b) => b.balance_cents - b.reserved_cents - (a.balance_cents - a.reserved_cents) || a.code.localeCompare(b.code));
  let remaining = requiredCents;
  const reservations: Reservation[] = [];
  for (const row of rows) {
    if (remaining <= 0) break;
    const amount = Math.min(remaining, row.balance_cents - row.reserved_cents);
    if (amount <= 0) continue;
    const result = await dbRun(env, 'UPDATE gift_cards SET reserved_cents = reserved_cents + ? WHERE id = ? AND disabled = 0 AND (expires_at IS NULL OR expires_at > ?) AND balance_cents - reserved_cents >= ?', amount, row.id, new Date().toISOString(), amount);
    if (result.meta?.changes !== 1) continue;
    await dbRun(env, 'INSERT INTO gift_redemptions (id, gift_card_id, order_id, amount_cents, status) VALUES (?, ?, ?, ?, ?)', id(), row.id, orderId, amount, 'reserved');
    reservations.push({ cardId: row.id, amountCents: amount, code: row.code });
    remaining -= amount;
  }
  if (reservations.length === 0) {
    await releaseReservations(env, reservations, orderId);
    throw new Error('Gift card balance is insufficient');
  }
  return { appliedCents: requiredCents - remaining, reservations };
}

export async function releaseReservations(env: Env, reservations: Reservation[], orderId: string): Promise<void> {
  for (const reservation of reservations) {
    await dbRun(env, 'UPDATE gift_cards SET reserved_cents = MAX(0, reserved_cents - ?) WHERE id = ?', reservation.amountCents, reservation.cardId);
    await dbRun(env, 'UPDATE gift_redemptions SET status = ? WHERE gift_card_id = ? AND order_id = ? AND status = ?', 'released', reservation.cardId, orderId, 'reserved');
  }
}

export async function applyReservations(env: Env, orderId: string): Promise<void> {
  const rows = await dbAll<{ gift_card_id: string; amount_cents: number }>(env, 'SELECT gift_card_id, amount_cents FROM gift_redemptions WHERE order_id = ? AND status = ?', orderId, 'reserved');
  for (const row of rows) {
    await dbRun(env, 'UPDATE gift_cards SET reserved_cents = MAX(0, reserved_cents - ?), balance_cents = MAX(0, balance_cents - ?) WHERE id = ?', row.amount_cents, row.amount_cents, row.gift_card_id);
    await dbRun(env, 'UPDATE gift_redemptions SET status = ? WHERE gift_card_id = ? AND order_id = ? AND status = ?', 'applied', row.gift_card_id, orderId, 'reserved');
  }
}

export async function createGiftCard(env: Env, data: { amountCents: number; purchaserEmail: string; recipientEmail?: string; recipientName?: string; message?: string; orderId: string }): Promise<{ code: string; displayCode: string; expiresAt: string }> {
  const code = generateGiftCode();
  const expiresAt = giftCardExpiry();
  await dbRun(env, 'INSERT INTO gift_cards (id, code_hash, code_last4, initial_cents, balance_cents, purchaser_email, recipient_email, recipient_name, message, order_id, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', id(), await hashGiftCode(env, code), code.slice(-4), data.amountCents, data.amountCents, data.purchaserEmail, data.recipientEmail ?? null, data.recipientName ?? null, data.message ?? null, data.orderId, expiresAt);
  return { code, displayCode: displayGiftCode(code), expiresAt };
}
