/**
 * Real customer quotes only (confirmed by the owner). `quote` is the words as
 * written, `who` is how the person is credited, and `kit` optionally ties a
 * quote to a kit id so the product page can prefer quotes about that kit.
 * The band renders nothing if this list is empty.
 */
export type Testimonial = { quote: string; who: string; kit?: string };

export const testimonials: Testimonial[] = [
  { quote: 'The kits gave us a gentle way to start conversations we had been putting off.', who: 'Crystal & Nishant' },
  { quote: 'Simple, thoughtful and easy to bring into an ordinary afternoon.', who: 'Dean' },
  { quote: 'The prompts helped us listen more and lecture less.', who: 'Jenny' },
  { quote: 'A lovely resource for making family conversations feel natural.', who: 'Bo' },
];

/** Quotes about this kit first, then general ones, capped at `limit`. */
export function testimonialsFor(kitId?: string, limit = 3): Testimonial[] {
  const preferred = kitId ? testimonials.filter((entry) => entry.kit === kitId) : [];
  const rest = testimonials.filter((entry) => !preferred.includes(entry));
  return [...preferred, ...rest].slice(0, limit);
}
