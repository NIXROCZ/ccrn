export const KIT_PRICE_CENTS = 3500;
/** Any three kits are priced together; the remainder is charged at full price. */
export const BUNDLE_SIZE = 3;
export const BUNDLE_PRICE_CENTS = 8900;
export const GIFT_PRESETS_CENTS = [3500, 5000, 10000, 20000] as const;
export const GIFT_MIN_CENTS = 1000;
export const GIFT_MAX_CENTS = 50000;
/** Gift cards are valid for three years, the Australian statutory minimum. */
export const GIFT_VALIDITY_YEARS = 3;
export type Cart = { kits: string[]; gifts: { amountCents: number; recipientName?: string; recipientEmail?: string; message?: string }[]; giftCodes: string[] };

/** Complete groups of three, ignoring the remainder. */
export function bundleCount(kitCount: number): number {
  return Math.floor(Math.max(0, kitCount) / BUNDLE_SIZE);
}

export function bundleDiscountFor(kitCount: number): number {
  return bundleCount(kitCount) * (BUNDLE_SIZE * KIT_PRICE_CENTS - BUNDLE_PRICE_CENTS);
}

/**
 * Per-kit amounts summing exactly to the discounted kit subtotal.
 *
 * A bundle is $89 for three, which does not divide evenly, so the odd cents are
 * spread across the group rather than rounded per line — otherwise the Stripe
 * session would not add up to the total we recorded against the order.
 */
export function kitLinePrices(kitCount: number): number[] {
  const groups = bundleCount(kitCount);
  const base = Math.floor(BUNDLE_PRICE_CENTS / BUNDLE_SIZE);
  const spare = BUNDLE_PRICE_CENTS - base * BUNDLE_SIZE;
  const prices: number[] = [];
  for (let group = 0; group < groups; group += 1) {
    for (let seat = 0; seat < BUNDLE_SIZE; seat += 1) prices.push(base + (seat < spare ? 1 : 0));
  }
  for (let extra = groups * BUNDLE_SIZE; extra < kitCount; extra += 1) prices.push(KIT_PRICE_CENTS);
  return prices;
}

export function priceCart(cart: Cart) {
  const kitSubtotal = cart.kits.length * KIT_PRICE_CENTS;
  const bundleDiscount = bundleDiscountFor(cart.kits.length);
  const giftSubtotal = cart.gifts.reduce((sum, gift) => sum + gift.amountCents, 0);
  return {
    kitSubtotal,
    bundleDiscount,
    giftSubtotal,
    total: kitSubtotal - bundleDiscount + giftSubtotal,
    bundles: bundleCount(cart.kits.length),
    isBundle: bundleCount(cart.kits.length) > 0,
  };
}

/**
 * "A$35.00", not "$35.00".
 *
 * The en-AU locale renders AUD with a bare dollar sign, which reads as USD to
 * anyone outside Australia and disagreed with the "A$0" placeholders the cart
 * ships in its markup. en-US renders the same number with the unambiguous A$
 * prefix and identical grouping and decimals.
 */
export function formatAud(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 }).format(cents / 100);
}
