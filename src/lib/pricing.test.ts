import { describe, expect, it } from 'vitest';
import { BUNDLE_DISCOUNT, GIFT_MAX_CENTS, GIFT_MIN_CENTS, KIT_PRICE_CENTS, priceCart } from './pricing';
describe('pricing', () => {
  const all = ['a', 'b', 'c'];
  it('applies the bundle discount only when all available kits are present', () => {
    expect(priceCart({ kits: all, gifts: [], giftCodes: [] }, all).bundleDiscount).toBe(Math.round(KIT_PRICE_CENTS * 3 * BUNDLE_DISCOUNT));
    expect(priceCart({ kits: ['a'], gifts: [], giftCodes: [] }, all).bundleDiscount).toBe(0);
  });
  it('does not discount gift cards', () => {
    const result = priceCart({ kits: all, gifts: [{ amountCents: 5000 }], giftCodes: [] }, all);
    expect(result.giftSubtotal).toBe(5000); expect(result.total).toBe(result.kitSubtotal - result.bundleDiscount + 5000);
  });
  it('defines the gift card bounds', () => { expect(GIFT_MIN_CENTS).toBe(1000); expect(GIFT_MAX_CENTS).toBe(50000); });
});
