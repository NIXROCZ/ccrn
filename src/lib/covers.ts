/**
 * Generated kit covers.
 *
 * Only one kit has a photographed cover. The rest get a deterministic SVG built
 * in the brand's layout — wordmark, collection, title, motif, strapline — so a
 * new kit looks finished the moment its copy lands, with no design round trip.
 * A real cover image, if one is uploaded to R2, always wins.
 *
 * These render at build time into static HTML. Nothing here runs per request.
 */

const P = {
  sage: '#879581',
  dark: '#65745F',
  deep: '#4E5B49',
  shell: '#F6F4EC',
  white: '#FFFFFF',
  ochre: '#BE7B2B',
  ink2: '#6A7166',
  yellow: '#E9C93F',
  title: '#45543F',
} as const;

/** Escapes text for inclusion in SVG character data or an attribute value. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const MOTIFS: Record<string, string> = {
  sugar: `<g><path d="M60 120h80v70H60z" fill="#F0EBDD" stroke="${P.ochre}" stroke-width="2"/>
    <path d="M60 120l22-22h80l-22 22M140 120l22-22v70l-22 22" fill="#E4DCC6" stroke="${P.ochre}" stroke-width="2"/>
    <circle cx="86" cy="212" r="11" fill="#F2EDE0"/><circle cx="114" cy="220" r="9" fill="#EDE6D5"/>
    <circle cx="140" cy="210" r="12" fill="#F2EDE0"/></g>`,

  label: `<g fill="none" stroke="${P.sage}" stroke-width="4"><circle cx="88" cy="112" r="46"/>
    <path d="M122 146l40 40" stroke-linecap="round"/></g>
    <path d="M118 90h72v104h-72z" fill="#F4F0E4" stroke="${P.ochre}" stroke-width="3"/>
    <g stroke="${P.sage}" stroke-width="3" stroke-linecap="round"><path d="M132 116h44M132 136h44M132 156h28"/></g>`,

  plastic: `<path d="M86 76h28v20l22 24v98a12 12 0 0 1-12 12H76a12 12 0 0 1-12-12v-98l22-24z"
      fill="#E4EDF0" stroke="#7A939C" stroke-width="3"/>
    <path d="M84 60h32v16H84z" fill="#7A939C"/>
    <path d="M150 160c26 0 26 40 0 40s-26-40 0-40z" fill="${P.sage}" opacity=".45"/>`,

  water: `<path d="M120 60c40 52 58 76 58 100a58 58 0 0 1-116 0c0-24 18-48 58-100z"
      fill="#CFE0E6" stroke="#7A939C" stroke-width="3"/>
    <path d="M96 168a26 26 0 0 0 26 26" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`,

  recycle: `<g fill="none" stroke="${P.sage}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
    <path d="M120 60l30 52h-60z"/><path d="M64 196l-14-56 52 14z"/><path d="M176 196l14-56-52 14z"/></g>
    <circle cx="120" cy="140" r="26" fill="${P.yellow}" opacity=".55"/>`,

  shield: `<path d="M120 52l58 22v54c0 44-28 72-58 88-30-16-58-44-58-88V74z" fill="#EDF0E8"
      stroke="${P.sage}" stroke-width="3"/>
    <path d="M120 108c-10-16-34-10-34 10 0 18 24 32 34 42 10-10 34-24 34-42 0-20-24-26-34-10z"
      fill="${P.ochre}" opacity=".55"/>`,

  feelings: `<circle cx="88" cy="100" r="30" fill="${P.yellow}" opacity=".6"/>
    <path d="M126 190a26 26 0 0 1 6-52 34 34 0 0 1 66 8 22 22 0 0 1-4 44z" fill="#E4EDF0" stroke="#7A939C" stroke-width="3"/>
    <g stroke="#7A939C" stroke-width="4" stroke-linecap="round"><path d="M132 208l-8 22M156 208l-8 22M180 208l-8 22"/></g>`,

  screen: `<rect x="52" y="72" width="136" height="94" rx="6" fill="#EDF0E8" stroke="${P.sage}" stroke-width="3"/>
    <path d="M104 166h32l8 30h-48z" fill="${P.sage}" opacity=".4"/>
    <circle cx="120" cy="119" r="22" fill="${P.yellow}" opacity=".6"/>
    <path d="M112 108l22 11-22 11z" fill="${P.white}"/>`,

  oil: `<path d="M104 56h32v22l24 30v86a14 14 0 0 1-14 14H94a14 14 0 0 1-14-14v-86l24-30z"
      fill="#F4EFDF" stroke="${P.ochre}" stroke-width="3"/>
    <path d="M102 44h36v12h-36z" fill="${P.sage}"/>
    <path d="M92 150h56v40a10 10 0 0 1-10 10h-36a10 10 0 0 1-10-10z" fill="${P.yellow}" opacity=".75"/>
    <path d="M120 92c9 12 14 19 14 25a14 14 0 0 1-28 0c0-6 5-13 14-25z" fill="${P.ochre}" opacity=".7"/>`,

  produce: `<path d="M62 116h116l-12 88a16 16 0 0 1-16 14H90a16 16 0 0 1-16-14z"
      fill="#F0EBDD" stroke="${P.sage}" stroke-width="3"/>
    <path d="M62 116h116" stroke="${P.sage}" stroke-width="3"/>
    <circle cx="98" cy="96" r="24" fill="${P.ochre}" opacity=".55"/>
    <circle cx="142" cy="100" r="18" fill="${P.yellow}" opacity=".7"/>
    <path d="M98 72c0-12 8-18 16-20-2 12-8 18-16 20z" fill="${P.sage}"/>
    <g stroke="${P.sage}" stroke-width="2.5" opacity=".7"><path d="M96 140v46M120 140v46M144 140v46"/></g>`,

  cup: `<path d="M76 96h80v72a30 30 0 0 1-30 30h-20a30 30 0 0 1-30-30z"
      fill="#E4EDF0" stroke="#7A939C" stroke-width="3"/>
    <path d="M156 116h16a20 20 0 0 1 0 40h-16" fill="none" stroke="#7A939C" stroke-width="3"/>
    <path d="M76 140h80v28a30 30 0 0 1-30 30h-20a30 30 0 0 1-30-30z" fill="${P.sage}" opacity=".4"/>
    <g stroke="${P.sage}" stroke-width="3" stroke-linecap="round" opacity=".75">
      <path d="M100 76c-8-10 8-16 0-26M126 76c-8-10 8-16 0-26"/></g>`,

  speech: `<path d="M56 74h96a12 12 0 0 1 12 12v52a12 12 0 0 1-12 12H92l-26 24v-24H56a12 12 0 0 1-12-12V86a12 12 0 0 1 12-12z"
      fill="#EDF0E8" stroke="${P.sage}" stroke-width="3"/>
    <path d="M124 128h60a12 12 0 0 1 12 12v40a12 12 0 0 1-12 12h-8v18l-20-18h-32a12 12 0 0 1-12-12z"
      fill="${P.yellow}" opacity=".55" stroke="${P.ochre}" stroke-width="2.5"/>
    <g stroke="${P.sage}" stroke-width="3" stroke-linecap="round"><path d="M70 100h68M70 118h44"/></g>`,

  friends: `<circle cx="88" cy="92" r="26" fill="${P.yellow}" opacity=".6" stroke="${P.sage}" stroke-width="2.5"/>
    <circle cx="152" cy="92" r="26" fill="${P.sage}" opacity=".45" stroke="${P.sage}" stroke-width="2.5"/>
    <path d="M50 194q0-40 38-40t38 40" fill="none" stroke="${P.sage}" stroke-width="3" stroke-linecap="round"/>
    <path d="M114 194q0-40 38-40t38 40" fill="none" stroke="${P.sage}" stroke-width="3" stroke-linecap="round"/>
    <path d="M108 128a22 22 0 0 0 24 0" fill="none" stroke="${P.ochre}" stroke-width="3" stroke-linecap="round"/>`,

  spray: `<path d="M92 92h44v106a12 12 0 0 1-12 12h-20a12 12 0 0 1-12-12z"
      fill="#E4EDF0" stroke="#7A939C" stroke-width="3"/>
    <path d="M98 68h32v24H98z" fill="#7A939C"/>
    <path d="M130 74h26l10-14" fill="none" stroke="${P.sage}" stroke-width="3" stroke-linecap="round"/>
    <path d="M92 132h44v66a12 12 0 0 1-12 12h-20a12 12 0 0 1-12-12z" fill="${P.sage}" opacity=".38"/>
    <g fill="${P.sage}" opacity=".65"><circle cx="176" cy="52" r="5"/><circle cx="192" cy="66" r="4"/>
      <circle cx="170" cy="76" r="4"/><circle cx="192" cy="42" r="3.5"/></g>`,

  sun: `<circle cx="120" cy="112" r="34" fill="${P.yellow}" opacity=".72"/>
    <g stroke="${P.ochre}" stroke-width="3" stroke-linecap="round" opacity=".75">
      <path d="M120 56v-14M120 182v-14M64 112H50M190 112h-14M80 72l-10-10M170 152l10 10M160 72l10-10M80 152l-10 10"/></g>
    <path d="M62 190h116" stroke="${P.sage}" stroke-width="3" stroke-linecap="round"/>
    <path d="M74 190v-34a46 46 0 0 1 92 0v34" fill="none" stroke="${P.sage}" stroke-width="3"/>
    <path d="M120 156v34" stroke="${P.sage}" stroke-width="2.5" opacity=".7"/>`,

  bowls: `<path d="M62 118h116" stroke="${P.sage}" stroke-width="3" stroke-linecap="round"/>
    <path d="M74 118h52a26 26 0 0 1-52 0z" fill="${P.ochre}" opacity=".5"/>
    <path d="M138 118h44a22 22 0 0 1-44 0z" fill="${P.sage}" opacity=".5"/>
    <path d="M86 150h68a34 34 0 0 1-68 0z" fill="${P.yellow}" opacity=".6"/>
    <g fill="${P.sage}" opacity=".55"><circle cx="96" cy="96" r="6"/><circle cx="118" cy="90" r="5"/>
      <circle cx="140" cy="96" r="6"/><circle cx="162" cy="92" r="4.5"/></g>`,

  leaf: `<path d="M120 56c48 32 52 90 0 146-52-56-48-114 0-146z" fill="${P.sage}" opacity=".45"/>
    <path d="M120 56c48 32 52 90 0 146-52-56-48-114 0-146z" fill="none" stroke="${P.sage}" stroke-width="3"/>
    <path d="M120 70v126M120 108l26-16M120 108l-26-16M120 142l30-18M120 142l-30-18" fill="none"
      stroke="${P.sage}" stroke-width="2" opacity=".8" stroke-linecap="round"/>`,
};

export interface CoverInput {
  title: string;
  coverTitle: string;
  collectionName: string;
  motif: string;
  coverLines: readonly [string, string];
}

/** The catalogue stores the two strapline halves as separate fields. */
export function coverSvgForKit(kit: {
  title: string;
  coverTitle: string;
  motif: string;
  coverLine1: string;
  coverLine2: string;
}, collectionName: string): string {
  return coverSvg({
    title: kit.title,
    coverTitle: kit.coverTitle,
    collectionName,
    motif: kit.motif,
    coverLines: [kit.coverLine1, kit.coverLine2],
  });
}

/**
 * A 1000×1000 cover. Long titles wrap onto a second line and the motif shifts
 * down to make room, so a two-word and a four-word title both sit correctly.
 */
export function coverSvg(kit: CoverInput): string {
  const upper = kit.coverTitle.toUpperCase();
  const words = upper.split(' ');

  let line1 = upper;
  let line2 = '';
  if (upper.length > 9 && words.length > 1) {
    const mid = Math.ceil(words.length / 2);
    line1 = words.slice(0, mid).join(' ');
    line2 = words.slice(mid).join(' ');
  }

  const longest = Math.max(line1.length, line2.length || 1);
  const size = Math.min(line2 ? 62 : 74, (640 / longest) * 1.55);
  /* A two-line title needs to start lower, or its cap-height runs back into
     the collection line above it. The motif drops with it to keep the spacing
     even. */
  const titleY = line2 ? 316 : 322;
  const lineGap = 78;
  const motifY = line2 ? 448 : 400;
  const motif = MOTIFS[kit.motif] ?? MOTIFS.leaf;

  return `<svg viewBox="0 0 1000 1000" role="img" aria-label="${esc(kit.title)} cover" xmlns="http://www.w3.org/2000/svg">
  <rect width="1000" height="1000" fill="${P.white}"/>
  <circle cx="500" cy="500" r="468" fill="${P.shell}"/>
  <text x="500" y="212" text-anchor="middle" font-family="Jost, sans-serif" font-size="27"
    letter-spacing="4" fill="${P.dark}">RAISING NOBLE</text>
  <text x="500" y="252" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="25"
    letter-spacing="1.6" fill="${P.dark}">${esc(kit.collectionName.toUpperCase())}</text>
  <text x="500" y="${titleY}" text-anchor="middle" font-family="Cormorant Garamond, serif" font-weight="500"
    font-size="${size.toFixed(1)}" letter-spacing="9" fill="${P.title}">${esc(line1)}</text>
  ${
    line2
      ? `<text x="500" y="${titleY + lineGap}" text-anchor="middle" font-family="Cormorant Garamond, serif" font-weight="500"
    font-size="${size.toFixed(1)}" letter-spacing="9" fill="${P.title}">${esc(line2)}</text>`
      : ''
  }
  <g transform="translate(380,${motifY}) scale(1.85)">${motif}</g>
  <text x="500" y="812" text-anchor="middle" font-family="Jost, sans-serif" font-size="19"
    fill="${P.ink2}">${esc(kit.coverLines[0])}</text>
  <text x="500" y="838" text-anchor="middle" font-family="Jost, sans-serif" font-size="19"
    fill="${P.ink2}">${esc(kit.coverLines[1])}</text>
</svg>`;
}

/** The bundle cover — same furniture, different title block. */
export function bundleCoverSvg(count: number): string {
  return coverSvg({
    title: 'The Complete Bundle',
    coverTitle: 'The Bundle',
    collectionName: 'Every published kit',
    motif: 'leaf',
    coverLines: [
      `All ${count} kit${count === 1 ? '' : 's'} we have published,`,
      'in a single download',
    ],
  });
}
