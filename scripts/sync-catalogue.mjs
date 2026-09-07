import fs from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const source = JSON.parse(await fs.readFile(path.join(root, 'src/data/kits.base.json'), 'utf8'));
const output = path.join(root, 'src/generated/catalogue.json');
await fs.mkdir(path.dirname(output), { recursive: true });
let catalogue = source;
if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
  try {
    const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/r2/buckets/raising-noble-kits/objects/`;
    const headers = { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` };
    const objects = []; let cursor = '';
    do {
      const response = await fetch(`${baseUrl}?prefix=kits/${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { headers });
      if (!response.ok) throw new Error(`R2 list ${response.status}`);
      const json = await response.json(); objects.push(...(json.result?.objects ?? [])); cursor = json.result_info?.cursor ?? '';
    } while (cursor);
    const keys = new Set(objects.map((entry) => entry.key)); const overrides = new Map();
    for (const key of keys) {
      const match = key.match(/^kits\/([^/]+)\/kit\.json$/); if (!match) continue;
      const response = await fetch(`${baseUrl}${encodeURIComponent(key)}`, { headers }); if (!response.ok) continue;
      const kit = await response.json();
      if (typeof kit.title !== 'string' || !['food', 'home', 'safety', 'life'].includes(kit.cat)) continue;
      if (kit.learn && (!Array.isArray(kit.learn) || kit.learn.length > 4 || kit.learn.some((pair) => !Array.isArray(pair) || pair.length !== 2))) continue;
      if (kit.ages && (!Number.isInteger(kit.ages.min) || !Number.isInteger(kit.ages.max) || kit.ages.min < 0 || kit.ages.max > 15 || kit.ages.min > kit.ages.max)) continue;
      const id = match[1]; overrides.set(id, { ...kit, id, status: keys.has(`kits/${id}/kit.zip`) ? 'available' : 'coming_soon' });
      const cover = await fetch(`${baseUrl}${encodeURIComponent(`kits/${id}/cover.webp`)}`, { headers });
      if (cover.ok) { const file = path.join(root, 'public/covers/synced', `${id}.webp`); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, Buffer.from(await cover.arrayBuffer())); overrides.get(id).cover = `/covers/synced/${id}.webp`; }
    }
    const merged = source.map((kit) => ({ ...kit, ...(overrides.get(kit.id) ?? {}) }));
    for (const [id, kit] of overrides) if (!source.some((entry) => entry.id === id)) merged.push({ ...kit, ages: kit.ages ?? { min: 5, max: 12 }, files: kit.files ?? source[0].files });
    const order = { food: 0, home: 1, safety: 2, life: 3 }; catalogue = merged.sort((a, b) => (order[a.cat] - order[b.cat]) || a.id.localeCompare(b.id));
  } catch (error) { console.warn(`Catalogue sync unavailable; using base catalogue: ${error.message}`); }
}
await fs.writeFile(output, `${JSON.stringify(catalogue, null, 2)}\n`);
