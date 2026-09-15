/**
 * Single source for the seller identity shown on the legal pages.
 *
 * `/privacy` and `/terms` both have to name the seller and give a way to reach
 * them. Keeping it here means the two pages can never disagree, and changing
 * the trading address is a one-line edit rather than a hunt through markup.
 */
export const seller = {
  name: 'Raising Noble',
  locality: 'Wollongong NSW, Australia',
  contactEmail: 'hello@raisingnoble.com',
  privacyEmail: 'privacy@raisingnoble.com',
} as const;

/** "Raising Noble, Wollongong NSW, Australia. Contact hello@raisingnoble.com." */
export const sellerIdentity = `${seller.name}, ${seller.locality}. Contact ${seller.contactEmail}.`;
