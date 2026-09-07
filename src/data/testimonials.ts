/**
 * Real customer quotes only.
 *
 * The design has a "What Families Are Saying" band on the shop and product
 * pages. It is built and styled, but it renders nothing while this list is
 * empty — publishing invented reviews on a storefront would misrepresent real
 * customers, so the band stays hidden until there are actual ones to show.
 *
 * To turn it on, add entries here. `quote` is the words as written, `who` is
 * how the person is credited (first name and a rough location is plenty), and
 * `kit` optionally ties it to a kit id so the product page can prefer quotes
 * about the kit being viewed.
 */
export type Testimonial = { quote: string; who: string; kit?: string };

export const testimonials: Testimonial[] = [];

/** Quotes about this kit first, then general ones, capped at `limit`. */
export function testimonialsFor(kitId?: string, limit = 3): Testimonial[] {
  const preferred = kitId ? testimonials.filter((entry) => entry.kit === kitId) : [];
  const rest = testimonials.filter((entry) => !preferred.includes(entry));
  return [...preferred, ...rest].slice(0, limit);
}
