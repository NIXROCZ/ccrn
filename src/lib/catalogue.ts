import base from '../generated/catalogue.json';
import { categories } from '../data/collections';
import { BUNDLE_DISCOUNT, formatAud, KIT_PRICE_CENTS } from './pricing';
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
  const count = availableKits().length;
  const wasCents = count * KIT_PRICE_CENTS;
  return { count, wasCents, priceCents: wasCents - Math.round(wasCents * BUNDLE_DISCOUNT) };
}
export function categoryLabel(id: string) { return categories.find((category) => category.id === id)?.label ?? id; }
export { formatAud };
