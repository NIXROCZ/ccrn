export const categories = [
  { id: 'food', label: 'Nourishing with knowledge', collection: 'Nourishing with knowledge' },
  { id: 'safety', label: 'Safe & Strong', collection: 'Safe & Strong' },
  { id: 'home', label: 'Hidden Home Influences', collection: 'Hidden Home Influences' },
] as const;

export const ageBands = [
  { id: '0-3', label: '0–3', min: 0, max: 3 },
  { id: '4-6', label: '4–6', min: 4, max: 6 },
  { id: '7-9', label: '7–9', min: 7, max: 9 },
  { id: '10-12', label: '10–12', min: 10, max: 12 },
  { id: '13-15', label: '13–15', min: 13, max: 15 },
] as const;

export type CategoryId = (typeof categories)[number]['id'];
