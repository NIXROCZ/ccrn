import { describe, expect, it } from 'vitest';
import { GIFT_VALIDITY_YEARS } from '../pricing';
import { displayGiftCode, formatGiftExpiry, giftCardExpired, giftCardExpiry, normaliseGiftCode } from './giftcards';

describe('gift card expiry', () => {
  const issued = new Date('2026-09-07T00:00:00.000Z');

  it('issues cards valid for three years', () => {
    expect(giftCardExpiry(issued)).toBe('2029-09-07T00:00:00.000Z');
    expect(GIFT_VALIDITY_YEARS).toBe(3);
  });

  it('accepts a card inside its window and refuses one past it', () => {
    const card = { expires_at: giftCardExpiry(issued) };
    expect(giftCardExpired(card, issued)).toBe(false);
    expect(giftCardExpired(card, new Date('2029-09-06T23:59:59.000Z'))).toBe(false);
    expect(giftCardExpired(card, new Date('2029-09-08T00:00:00.000Z'))).toBe(true);
  });

  it('treats the expiry instant itself as expired', () => {
    const card = { expires_at: '2029-09-07T00:00:00.000Z' };
    expect(giftCardExpired(card, new Date('2029-09-07T00:00:00.000Z'))).toBe(true);
  });

  it('never expires a card sold before expiry dates existed', () => {
    // Those cards were sold under terms promising the balance never expires.
    expect(giftCardExpired({ expires_at: null }, new Date('2099-01-01T00:00:00.000Z'))).toBe(false);
  });

  it('shows the date the way an Australian customer reads it', () => {
    expect(formatGiftExpiry('2029-09-07T00:00:00.000Z')).toBe('7 September 2029');
  });

  it('still normalises and formats codes', () => {
    expect(normaliseGiftCode(' abc de-fghij ')).toBe('ABCDEFGHIJ');
    expect(displayGiftCode('ABCDEFGHIJ')).toBe('ABCDE-FGHIJ');
  });
});
