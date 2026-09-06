import { describe, expect, it } from 'vitest';
import { MOTIFS, coverSvg, coverSvgForKit } from './covers';
import kits from '../data/kits.base.json';
import { categories, ageBands } from '../data/collections';

type SeedKit = (typeof kits)[number];

describe('catalogue integrity', () => {
  it('is three collections of five', () => {
    expect(categories).toHaveLength(3);
    expect(kits).toHaveLength(15);
    for (const category of categories) {
      expect(kits.filter((kit: SeedKit) => kit.cat === category.id)).toHaveLength(5);
    }
  });

  it('gives every kit its own motif', () => {
    // Six kits used to share a mark with another, so the shop grid showed the
    // same tile three times over.
    const seen = new Map<string, string>();
    for (const kit of kits as SeedKit[]) {
      const clash = seen.get(kit.motif);
      expect(clash, `${kit.id} and ${clash} share the motif "${kit.motif}"`).toBeUndefined();
      seen.set(kit.motif, kit.id);
    }
    expect(new Set(kits.map((k: SeedKit) => k.motif)).size).toBe(15);
  });

  it('only uses motifs the generator can draw', () => {
    for (const kit of kits as SeedKit[]) {
      expect(MOTIFS[kit.motif], `${kit.id}: motif "${kit.motif}" is not defined`).toBeTruthy();
    }
  });

  it('has enough copy on every kit to render a page', () => {
    for (const kit of kits as SeedKit[]) {
      expect(kit.id).toMatch(/^[a-z0-9-]+$/);
      expect(kit.title.length).toBeGreaterThan(3);
      expect(kit.blurb.length).toBeGreaterThan(20);
      expect(kit.learn).toHaveLength(4);
      expect(kit.files.length).toBeGreaterThan(0);
      expect(kit.ages.min).toBeLessThanOrEqual(kit.ages.max);
      expect(categories.some((c) => c.id === kit.cat)).toBe(true);
    }
  });

  it('has every kit reachable by at least one age band', () => {
    for (const kit of kits as SeedKit[]) {
      const reachable = ageBands.some((b) => kit.ages.min <= b.max && kit.ages.max >= b.min);
      expect(reachable, `${kit.id} matches no age filter`).toBe(true);
    }
  });
});

describe('cover generator', () => {
  it('escapes its inputs rather than emitting raw markup', () => {
    const svg = coverSvg({
      title: 'Bad <script>alert(1)</script>',
      coverTitle: 'X & Y',
      collectionName: '"quoted"',
      motif: 'leaf',
      coverLines: ['<b>one</b>', "it's two"],
    });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;');
    expect(svg).toContain('&amp;');
  });

  it('keeps a wrapped title clear of the collection line above it', () => {
    // A two-line title used to start at y=300 with a 74px face, whose cap
    // height ran back into the collection line at y=252.
    const svg = coverSvgForKit(
      { title: 'Body Safety Kit', coverTitle: 'Body Safety', motif: 'shield', coverLine1: 'a', coverLine2: 'b' },
      'Safe & Strong',
    );
    const sizes = [...svg.matchAll(/font-size="([\d.]+)"/g)].map((m) => Number(m[1]));
    const titleSize = Math.max(...sizes);
    const titleY = Number(/y="(\d+)" text-anchor="middle" font-family="Cormorant Garamond, serif" font-weight="500"/.exec(svg)?.[1]);
    expect(titleSize).toBeLessThanOrEqual(62);
    expect(titleY - titleSize).toBeGreaterThan(252);
  });

  it('renders a cover for every kit in the catalogue', () => {
    for (const kit of kits as SeedKit[]) {
      const svg = coverSvgForKit(kit, categories.find((c) => c.id === kit.cat)?.collection ?? '');
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('</svg>');
    }
  });
});
