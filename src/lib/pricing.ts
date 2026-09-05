export const KIT_PRICE_CENTS = 3500;
export const BUNDLE_DISCOUNT = 0.3;
export const GIFT_PRESETS_CENTS = [3500, 5000, 10000, 20000] as const;
export const GIFT_MIN_CENTS = 1000;
export const GIFT_MAX_CENTS = 50000;
export type Cart = { kits: string[]; gifts: { amountCents: number; recipientName?: string; recipientEmail?: string; message?: string }[]; giftCodes: string[] };
export function priceCart(cart: Cart, availableKitIds: string[]) {
  const kitSubtotal = cart.kits.length * KIT_PRICE_CENTS;
  const isBundle = availableKitIds.length > 0 && availableKitIds.every((id) => cart.kits.includes(id));
  const bundleDiscount = isBundle ? Math.round(kitSubtotal * BUNDLE_DISCOUNT) : 0;
  const giftSubtotal = cart.gifts.reduce((sum, gift) => sum + gift.amountCents, 0);
  return { kitSubtotal, bundleDiscount, giftSubtotal, total: kitSubtotal - bundleDiscount + giftSubtotal, isBundle };
}
export function formatAud(cents: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 }).format(cents / 100);
}
