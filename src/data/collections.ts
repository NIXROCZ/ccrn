/**
 * Collection names are customer-facing category labels, not series branding.
 *
 * The series names ("Nourishing With Knowledge", "Hidden Home Influences",
 * "Safe & Strong") read as poetry to us and as a riddle to a shopper deciding
 * which filter to press, so the labels say what the kits are about instead.
 * `id` is the stored value in kits.base.json and must not change.
 */
export const categories = [
  { id: 'food', label: 'Food & Nutrition', collection: 'Food & Nutrition' },
  { id: 'life', label: 'Life Skills', collection: 'Life Skills' },
  { id: 'home', label: 'Home & Environment', collection: 'Home & Environment' },
  { id: 'safety', label: 'Safety & Wellbeing', collection: 'Safety & Wellbeing' },
] as const;

/**
 * Age bands are open-ended: a kit suits a child from `min` upwards, with no
 * upper cut-off. A parent picks their child's age and sees everything that
 * child is old enough for, so the counts grow as the bands do.
 *
 * The values cover every `ages.min` present in the catalogue (3 to 8). Adding a
 * kit with a lower or higher minimum means adding a band here, or it becomes
 * unreachable from the oldest band.
 */
export const ageBands = [
  { id: '3', label: '3+', min: 3 },
  { id: '4', label: '4+', min: 4 },
  { id: '5', label: '5+', min: 5 },
  { id: '6', label: '6+', min: 6 },
  { id: '7', label: '7+', min: 7 },
  { id: '8', label: '8+', min: 8 },
] as const;
export type CategoryId = (typeof categories)[number]['id'];
