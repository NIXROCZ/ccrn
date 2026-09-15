import { describe, expect, it } from 'vitest';
import { MOTIFS, coverSvg, coverSvgForKit } from './covers';
import kits from '../data/kits.base.json';
import { categories, ageBands } from '../data/collections';

type SeedKit = (typeof kits)[number];

describe('catalogue integrity', () => {
  it('is four collections of five', () => {
    expect(categories).toHaveLength(4);
    expect(kits).toHaveLength(20);
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
    expect(new Set(kits.map((k: SeedKit) => k.motif)).size).toBe(20);
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
      // blurb is the <meta description>; search engines truncate around 160.
      expect(kit.blurb.length, `${kit.id} blurb is too long for a search snippet`).toBeLessThanOrEqual(160);
      // intro is the warm opening the product page shows, so it has room.
      expect(kit.intro.length, `${kit.id} has no intro`).toBeGreaterThan(80);
      expect(kit.intro).not.toBe(kit.blurb);
      expect(kit.learn).toHaveLength(4);
      expect(kit.files.length).toBeGreaterThan(0);
      expect(kit.ages.min).toBeLessThanOrEqual(kit.ages.max);
      expect(categories.some((c) => c.id === kit.cat)).toBe(true);
    }
  });

  it('has every kit reachable by at least one age band', () => {
    // Bands are open-ended now: a band shows every kit a child of that age is
    // old enough to start. A kit whose minimum sits above the highest band is
    // unreachable from the shop, which is the failure this guards.
    for (const kit of kits as SeedKit[]) {
      const reachable = ageBands.some((band) => kit.ages.min <= band.min);
      expect(reachable, `${kit.id} starts above every age filter`).toBe(true);
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

describe('the real Canva catalogue', () => {
  it('carries the kits that actually exist in Canva', () => {
    const byCat = (cat: string) => kits.filter((kit: SeedKit) => kit.cat === cat).map((kit: SeedKit) => kit.id);
    expect(byCat('food')).toEqual(['seed-oils', 'refined-sugar', 'artificial-colours', 'artificial-flavours', 'preservatives']);
    expect(byCat('home')).toEqual(['emfs', 'aluminium', 'forever-chemicals', 'microplastics', 'artificial-fragrances']);
    expect(byCat('safety')).toEqual(['getting-lost', 'unsafe-secrets', 'unsafe-touch', 'personal-space', 'trusted-adults']);
  });

  it('lists the six documents every delivered kit archive holds', () => {
    // An earlier version of this test asserted five files "and no PPTX", on the
    // reasoning that Canva exports PDF and a PowerPoint would be a promise we
    // could not keep. The delivered archives disprove it: each ships the deck
    // twice, as an editable .pptx and as a .pdf that opens anywhere. Verified
    // against the supplied aluminium, artificial-colours, artificial-flavours,
    // artificial-fragrances and emfs archives.
    //
    // The names here are what a buyer reads before paying, so they have to match
    // what is inside the ZIP. README.txt is a helper, not a deliverable.
    for (const kit of kits as SeedKit[]) {
      expect(kit.files, kit.id).toEqual([
        'Presentation (PPTX)',
        'Presentation (PDF)',
        'Activity 1 (PDF)',
        'Activity 2 (PDF)',
        'Parent and Carer Guide (PDF)',
        'Viewing Guide (PDF)',
      ]);
    }
  });

  it('sells the fifteen finished kits and holds back Life Skills', () => {
    // Three collections of five are built and ready to sell; Life Skills is a
    // placeholder collection with no assets behind it yet.
    const available = kits.filter((kit: SeedKit) => kit.status === 'available');
    expect(available).toHaveLength(15);
    for (const cat of ['food', 'home', 'safety']) {
      expect(available.filter((kit: SeedKit) => kit.cat === cat), cat).toHaveLength(5);
    }
    expect(kits.filter((kit: SeedKit) => kit.cat === 'life').every((kit: SeedKit) => kit.status === 'coming_soon')).toBe(true);
  });

  it('keeps every id usable as an R2 key and a URL segment', () => {
    // The download route reads kits/<id>/kit.zip, so an id is also a filename.
    for (const kit of kits as SeedKit[]) expect(kit.id, kit.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe('cover geometry', () => {
  it('draws the motif with a transform, never a nested svg', () => {
    // `.cover svg { width: 100% }` in global.css is a descendant selector, so a
    // nested <svg> would be resized by it and the motif would fly off-centre.
    for (const kit of kits as SeedKit[]) {
      const svg = coverSvgForKit(kit, 'Nourishing With Knowledge');
      expect(svg.match(/<svg/g), kit.id).toHaveLength(1);
    }
  });

  it('centres the motif and keeps it clear of the strapline', () => {
    for (const kit of kits as SeedKit[]) {
      const svg = coverSvgForKit(kit, 'Nourishing With Knowledge');
      const match = svg.match(/translate\(([\d.]+),([\d.]+)\) scale\(([\d.]+)\)/);
      expect(match, kit.id).not.toBeNull();
      const [x, y, scale] = match!.slice(1).map(Number);
      // The shared motif box is 36,36 168x184.
      expect(x + 120 * scale, `${kit.id} centred`).toBeCloseTo(500, 0);
      expect(y + 220 * scale, `${kit.id} clears the strapline`).toBeLessThan(790);
    }
  });
});
