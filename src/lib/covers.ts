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
  sugar: `<path d="M74 98h92v84a30 30 0 0 1-30 30h-32a30 30 0 0 1-30-30z" fill="#F2E4D5"
      stroke="${P.ochre}" stroke-width="3"/>
    <rect x="66" y="74" width="108" height="26" rx="9" fill="${P.ochre}" opacity=".85"/>
    <rect x="106" y="56" width="28" height="20" rx="7" fill="${P.ochre}" opacity=".85"/>
    <g fill="${P.white}" stroke="${P.ochre}" stroke-width="2">
      <rect x="92" y="148" width="27" height="27" rx="4"/><rect x="124" y="160" width="25" height="25" rx="4"/></g>`,

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

  bowls: `<path d="M56 116h128a64 40 0 0 1-128 0z" fill="#F0EBDD" stroke="${P.ochre}" stroke-width="3"/>
    <path d="M76 128h88a44 28 0 0 1-88 0z" fill="${P.yellow}" opacity=".62"/>
    <path d="M56 116h128" stroke="${P.ochre}" stroke-width="3" stroke-linecap="round"/>
    <path d="M152 106l38-44" stroke="${P.sage}" stroke-width="9" stroke-linecap="round"/>
    <ellipse cx="148" cy="110" rx="17" ry="10" fill="${P.sage}" opacity=".7" transform="rotate(-41 148 110)"/>
    <g fill="${P.sage}" opacity=".5"><circle cx="86" cy="92" r="5"/><circle cx="108" cy="83" r="4"/>
      <circle cx="130" cy="92" r="4.5"/></g>`,

  leaf: `<path d="M120 56c48 32 52 90 0 146-52-56-48-114 0-146z" fill="${P.sage}" opacity=".45"/>
    <path d="M120 56c48 32 52 90 0 146-52-56-48-114 0-146z" fill="none" stroke="${P.sage}" stroke-width="3"/>
    <path d="M120 70v126M120 108l26-16M120 108l-26-16M120 142l30-18M120 142l-30-18" fill="none"
      stroke="${P.sage}" stroke-width="2" opacity=".8" stroke-linecap="round"/>`,
  droppers: `<g stroke-width="3">
    <rect x="62" y="122" width="34" height="84" rx="7" fill="#DCE9EE" stroke="#5D93A6"/>
    <rect x="69" y="102" width="20" height="22" rx="4" fill="#5D93A6"/>
    <path d="M62 156h34v43a7 7 0 0 1-7 7H69a7 7 0 0 1-7-7z" fill="#5D93A6" opacity=".72"/>
    <rect x="103" y="106" width="34" height="100" rx="7" fill="#F6F1E2" stroke="${P.ochre}"/>
    <rect x="110" y="86" width="20" height="22" rx="4" fill="${P.ochre}"/>
    <path d="M103 146h34v53a7 7 0 0 1-7 7h-20a7 7 0 0 1-7-7z" fill="${P.yellow}" opacity=".82"/>
    <rect x="144" y="132" width="34" height="74" rx="7" fill="#F3E5E0" stroke="#B4685A"/>
    <rect x="151" y="112" width="20" height="22" rx="4" fill="#B4685A"/>
    <path d="M144 166h34v33a7 7 0 0 1-7 7h-20a7 7 0 0 1-7-7z" fill="#C9564A" opacity=".7"/></g>`,

  bottle: `<path d="M104 64h32v20l18 26v90a14 14 0 0 1-14 14h-40a14 14 0 0 1-14-14v-90l18-26z"
      fill="#F3E5E0" stroke="#B4685A" stroke-width="3"/>
    <path d="M102 50h36v14h-36z" fill="#B4685A"/>
    <path d="M86 142h68v52a14 14 0 0 1-14 14h-40a14 14 0 0 1-14-14z" fill="#C9564A" opacity=".78"/>
    <g fill="#C9564A"><circle cx="180" cy="76" r="7" opacity=".55"/><circle cx="196" cy="96" r="5" opacity=".4"/>
      <circle cx="176" cy="102" r="4" opacity=".45"/></g>`,

  spoon: `<path d="M134 156l54-42" stroke="#4E9BA8" stroke-width="13" stroke-linecap="round"/>
    <ellipse cx="98" cy="170" rx="44" ry="27" fill="#F0EBDD" stroke="${P.ochre}" stroke-width="3"/>
    <ellipse cx="98" cy="164" rx="34" ry="18" fill="${P.yellow}" opacity=".7"/>
    <g fill="${P.sage}" opacity=".5"><circle cx="78" cy="126" r="4.5"/><circle cx="102" cy="116" r="3.5"/>
      <circle cx="122" cy="130" r="3"/></g>`,

  waves: `<g fill="none" stroke="#7A939C" stroke-width="15" stroke-linecap="round">
      <path d="M50 128a98 98 0 0 1 140 0"/><path d="M78 160a58 58 0 0 1 84 0"/></g>
    <circle cx="120" cy="194" r="15" fill="#7A939C"/>
    <path d="M50 128a98 98 0 0 1 140 0" fill="none" stroke="${P.sage}" stroke-width="4" opacity=".45"/>`,

  foil: `<path d="M52 130l62-42 76 32-62 44z" fill="#E1E7EC" stroke="#7A939C" stroke-width="3"/>
    <path d="M52 130v36l76 36 62-46v-36l-62 44z" fill="#BFC9D3" stroke="#7A939C" stroke-width="3"/>
    <g stroke="#FFFFFF" stroke-width="4" opacity=".65" stroke-linecap="round">
      <path d="M74 120l60 25M98 105l60 25"/></g>`,

  pan: `<path d="M172 122l28-22" stroke="#5F676D" stroke-width="11" stroke-linecap="round"/>
    <ellipse cx="110" cy="152" rx="68" ry="44" fill="#9AA0A6" stroke="#5F676D" stroke-width="3"/>
    <ellipse cx="110" cy="144" rx="54" ry="32" fill="#4A5157"/>
    <path d="M82 134a36 22 0 0 1 42-8" fill="none" stroke="#FFFFFF" stroke-width="4" opacity=".3"
      stroke-linecap="round"/>`,

  bag: `<path d="M74 98h92l14 106a12 12 0 0 1-12 14H72a12 12 0 0 1-12-14z" fill="#E4EDF0"
      stroke="#7A939C" stroke-width="3"/>
    <path d="M92 98V80a28 28 0 0 1 56 0v18" fill="none" stroke="#7A939C" stroke-width="3"/>
    <g stroke="#FFFFFF" stroke-width="4" opacity=".7" stroke-linecap="round">
      <path d="M90 126c14 18 8 42 22 60M144 126c-12 20-6 44-18 62"/></g>`,

  flask: `<path d="M132 100h26v32l28 60a11 11 0 0 1-10 16h-62a11 11 0 0 1-10-16l28-60z"
      fill="#F3E5E0" stroke="#B4685A" stroke-width="3"/>
    <path d="M124 166h42l20 26a11 11 0 0 1-10 16h-62a11 11 0 0 1-10-16z" fill="#C9564A" opacity=".72"/>
    <path d="M78 68h28v36l30 68a12 12 0 0 1-11 18H59a12 12 0 0 1-11-18l30-68z"
      fill="#F6F1E2" stroke="${P.ochre}" stroke-width="3"/>
    <path d="M66 146h52l18 26a12 12 0 0 1-11 18H59a12 12 0 0 1-11-18z" fill="${P.yellow}" opacity=".85"/>`,

  pin: `<ellipse cx="120" cy="208" rx="34" ry="9" fill="${P.sage}" opacity=".32"/>
    <path d="M120 50a54 54 0 0 1 54 54c0 39-54 98-54 98s-54-59-54-98a54 54 0 0 1 54-54z"
      fill="#C9564A" stroke="#A2453B" stroke-width="3"/>
    <circle cx="120" cy="104" r="21" fill="${P.white}"/>`,

  lock: `<path d="M86 114V90a34 34 0 0 1 68 0v24" fill="none" stroke="#9AA0A6" stroke-width="15"
      stroke-linecap="round"/>
    <rect x="62" y="112" width="116" height="92" rx="13" fill="${P.yellow}" stroke="${P.ochre}" stroke-width="3"/>
    <circle cx="120" cy="146" r="13" fill="${P.ochre}"/>
    <path d="M120 156v24" stroke="${P.ochre}" stroke-width="9" stroke-linecap="round"/>`,

  hand: `<g fill="#F2CDAC" stroke="${P.ochre}" stroke-width="2.5" stroke-linejoin="round">
      <rect x="76" y="76" width="21" height="74" rx="10.5"/><rect x="99" y="58" width="21" height="88" rx="10.5"/>
      <rect x="122" y="64" width="21" height="82" rx="10.5"/><rect x="145" y="84" width="21" height="66" rx="10.5"/>
      <path d="M62 136a13 13 0 0 1 22-9l12 11v-12h74v46a46 46 0 0 1-46 46h-16a42 42 0 0 1-32-15z"/></g>`,

  figure: `<circle cx="120" cy="138" r="78" fill="none" stroke="${P.sage}" stroke-width="3" stroke-dasharray="11 9"/>
    <circle cx="120" cy="138" r="62" fill="#E4EDF0" opacity=".55"/>
    <path d="M120 128c23 0 31 19 31 40v34H89v-34c0-21 8-40 31-40z" fill="#F2CDAC" stroke="${P.ochre}" stroke-width="2.5"/>
    <circle cx="120" cy="104" r="19" fill="#F2CDAC" stroke="${P.ochre}" stroke-width="2.5"/>`,

  alert: `<path d="M120 52l78 134a13 13 0 0 1-11 20H53a13 13 0 0 1-11-20z" fill="${P.yellow}"
      stroke="#2F2F2F" stroke-width="6" stroke-linejoin="round"/>
    <path d="M120 106v46" stroke="#2F2F2F" stroke-width="12" stroke-linecap="round"/>
    <circle cx="120" cy="174" r="7.5" fill="#2F2F2F"/>`,

  coins: `<g stroke="${P.ochre}" stroke-width="3">
      <path d="M56 186v-24h92v24a46 15 0 0 1-92 0z" fill="${P.yellow}"/>
      <ellipse cx="102" cy="162" rx="46" ry="15" fill="#F4E39A"/>
      <path d="M56 162v-22h92v22" fill="${P.yellow}"/>
      <ellipse cx="102" cy="140" rx="46" ry="15" fill="#F4E39A"/>
      <ellipse cx="160" cy="112" rx="38" ry="13" fill="${P.yellow}"/></g>
    <path d="M96 128v24M90 134h14M90 146h14" stroke="${P.ochre}" stroke-width="3" stroke-linecap="round" fill="none"/>`,

  clock: `<circle cx="120" cy="134" r="74" fill="${P.shell}" stroke="${P.sage}" stroke-width="4"/>
    <circle cx="120" cy="134" r="60" fill="none" stroke="${P.sage}" stroke-width="2" opacity=".45"/>
    <g stroke="${P.deep}" stroke-width="7" stroke-linecap="round"><path d="M120 134V88"/><path d="M120 134l32 21"/></g>
    <circle cx="120" cy="134" r="7" fill="${P.ochre}"/>
    <g stroke="${P.sage}" stroke-width="4" stroke-linecap="round">
      <path d="M120 70v-11M120 209v-11M186 134h11M43 134h11"/></g>`,
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
     the collection line above it. The motif band shrinks and drops with it so
     it still clears the strapline at y=812. */
  const titleY = line2 ? 316 : 322;
  const lineGap = 78;
  const motifY = line2 ? 448 : 392;
  const motifSize = line2 ? 322 : 378;
  const motif = MOTIFS[kit.motif] ?? MOTIFS.leaf;
  /* Motifs are drawn against a shared 36,36 168x184 box. A nested <svg> with a
     viewBox would centre them for free, but `.cover svg { width: 100% }` in
     global.css is a descendant selector and would resize it, so the box is
     mapped by hand instead. */
  const motifScale = motifSize / 184;
  const motifX = 500 - 120 * motifScale;
  const motifTop = motifY - 36 * motifScale;

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
  <g transform="translate(${motifX.toFixed(1)},${motifTop.toFixed(1)}) scale(${motifScale.toFixed(4)})">${motif}</g>
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
