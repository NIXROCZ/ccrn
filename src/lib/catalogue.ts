import base from '../generated/catalogue.json';
import { categories } from '../data/collections';
import { BUNDLE_PRICE_CENTS, BUNDLE_SIZE, formatAud, KIT_PRICE_CENTS } from './pricing';
export type Kit = {
  id: string; cat: string; title: string; coverTitle: string; coverLine1: string; coverLine2: string;
  blurb: string; learn: [string, string][]; ages: { min: number; max: number }; motif: string;
  status: 'available' | 'coming_soon'; files: string[]; best?: boolean; sensitive?: boolean;
  realCover?: boolean; cover?: string;
};
export function getKits(): Kit[] { return base as unknown as Kit[]; }
export function getKit(id: string) { return getKits().find((kit) => kit.id === id); }
export function availableKits() { return getKits().filter((kit) => kit.status === 'available'); }
export function bundle() {
  const wasCents = BUNDLE_SIZE * KIT_PRICE_CENTS;
  return {
    count: availableKits().length,
    size: BUNDLE_SIZE,
    wasCents,
    priceCents: BUNDLE_PRICE_CENTS,
    saveCents: wasCents - BUNDLE_PRICE_CENTS,
  };
}
export function categoryLabel(id: string) { return categories.find((category) => category.id === id)?.label ?? id; }
export { formatAud };
