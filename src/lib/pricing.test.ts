import { describe, expect, it } from 'vitest';
import {
  BUNDLE_PRICE_CENTS,
  BUNDLE_SIZE,
  GIFT_MAX_CENTS,
  GIFT_MIN_CENTS,
  GIFT_VALIDITY_YEARS,
  KIT_PRICE_CENTS,
  bundleDiscountFor,
  formatAud,
  kitLinePrices,
  priceCart,
} from './pricing';

const kits = (count: number) => Array.from({ length: count }, (_, index) => `kit-${index}`);
const cart = (count: number, gifts: { amountCents: number }[] = []) => ({ kits: kits(count), gifts, giftCodes: [] });

describe('three for $89', () => {
  it('prices every complete group of three at the bundle price', () => {
    // 1 and 2 kits pay full price; the third completes a group.
    const expected = [0, 3500, 7000, 8900, 12400, 15900, 17800, 21300];
    for (let count = 0; count < expected.length; count += 1) {
      expect(priceCart(cart(count)).total, `${count} kits`).toBe(expected[count]);
    }
  });

  it('discounts each group by exactly the difference', () => {
    const perGroup = BUNDLE_SIZE * KIT_PRICE_CENTS - BUNDLE_PRICE_CENTS;
    expect(perGroup).toBe(1600);
    expect(bundleDiscountFor(2)).toBe(0);
    expect(bundleDiscountFor(3)).toBe(perGroup);
    expect(bundleDiscountFor(5)).toBe(perGroup);
    expect(bundleDiscountFor(6)).toBe(perGroup * 2);
    expect(bundleDiscountFor(0)).toBe(0);
  });

  it('reports how many bundles a cart earned', () => {
    expect(priceCart(cart(2)).bundles).toBe(0);
    expect(priceCart(cart(2)).isBundle).toBe(false);
    expect(priceCart(cart(7)).bundles).toBe(2);
    expect(priceCart(cart(7)).isBundle).toBe(true);
  });

  it('does not discount gift cards, and does not let them earn a bundle', () => {
    const result = priceCart(cart(3, [{ amountCents: 5000 }]));
    expect(result.giftSubtotal).toBe(5000);
    expect(result.bundleDiscount).toBe(1600);
    expect(result.total).toBe(result.kitSubtotal - result.bundleDiscount + 5000);
    expect(priceCart(cart(0, [{ amountCents: 5000 }, { amountCents: 5000 }, { amountCents: 5000 }])).bundleDiscount).toBe(0);
  });
});

describe('kit line prices', () => {
  it('always sums to the discounted subtotal', () => {
    // $89 does not divide by three, so the odd cents have to land somewhere; if
    // they are rounded away the Stripe session stops matching the order total.
    for (let count = 0; count <= 15; count += 1) {
      const lines = kitLinePrices(count);
      expect(lines, `${count} lines`).toHaveLength(count);
      const totals = priceCart(cart(count));
      expect(lines.reduce((sum, line) => sum + line, 0), `${count} kits`).toBe(totals.kitSubtotal - totals.bundleDiscount);
    }
  });

  it('charges the remainder at full price', () => {
    expect(kitLinePrices(4)).toEqual([2967, 2967, 2966, KIT_PRICE_CENTS]);
    expect(kitLinePrices(1)).toEqual([KIT_PRICE_CENTS]);
  });
});

describe('gift card bounds', () => {
  it('defines the amount range', () => {
    expect(GIFT_MIN_CENTS).toBe(1000);
    expect(GIFT_MAX_CENTS).toBe(50000);
  });

  it('sets validity to the Australian statutory minimum', () => {
    expect(GIFT_VALIDITY_YEARS).toBe(3);
  });
});

describe('currency display', () => {
  it('prefixes A$ so the amount cannot be read as USD', () => {
    // en-AU renders AUD as a bare "$", which is ambiguous to anyone outside
    // Australia and disagreed with the "A$0" placeholders in the cart markup.
    expect(formatAud(3500)).toBe('A$35.00');
    expect(formatAud(8900)).toBe('A$89.00');
    expect(formatAud(0)).toBe('A$0.00');
    expect(formatAud(123456)).toBe('A$1,234.56');
  });
});
