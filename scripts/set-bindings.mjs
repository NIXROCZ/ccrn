/**
 * Point wrangler.jsonc at a different Cloudflare account.
 *
 * Every binding id lives in wrangler.jsonc twice — once in the root block and
 * once under `env.preview`. Pasting an id into one and forgetting the other is
 * the classic way to have preview quietly write into the production database,
 * so this script writes both and then proves what it wrote.
 *
 *   node scripts/set-bindings.mjs --d1 <id> --kv <id> --catalogue-kv <id>
 *
 * Add --preview-d1 / --preview-kv / --preview-catalogue-kv to give preview its
 * own resources. Without them preview shares production's, which is fine for a
 * staging look but means test orders land in the real orders table.
 *
 *   --site-url        production URL, e.g. https://raisingnoble.com
 *   --preview-url     preview URL, e.g. https://raising-noble-preview.acme.workers.dev
 *   --bucket          R2 bucket name (shared by both; the kits are read-only)
 *   --check           print the current bindings and change nothing
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const FILE = path.join(process.cwd(), 'wrangler.jsonc');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX32 = /^[0-9a-f]{32}$/i;

const args = process.argv.slice(2);
const flag = (name) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? undefined : args[at + 1];
};

const raw = await fs.readFile(FILE, 'utf8');
if (/^\s*\/\//m.test(raw)) {
  console.error('wrangler.jsonc contains // comments; they will not survive this rewrite.');
  console.error('Remove them, or edit the file by hand.');
  process.exit(1);
}
const config = JSON.parse(raw);

const blocks = [
  { label: 'production', node: config, prefix: '' },
  { label: 'preview', node: config.env.preview, prefix: 'preview-' },
];

const show = () => {
  for (const { label, node } of blocks) {
    const kv = Object.fromEntries(node.kv_namespaces.map((entry) => [entry.binding, entry.id]));
    console.log(`${label.padEnd(11)} D1 ${node.d1_databases[0].database_id}`);
    console.log(`${' '.repeat(11)} KV ${kv.KV}  CATALOGUE_KV ${kv.CATALOGUE_KV}`);
    console.log(`${' '.repeat(11)} R2 ${node.r2_buckets[0].bucket_name}  SITE_URL ${node.vars.SITE_URL}`);
  }
};

if (args.includes('--check') || args.length === 0) {
  show();
  process.exit(0);
}

/** Preview falls back to the production value when no preview-specific one is given. */
const valueFor = (prefix, name) => flag(`${prefix}${name}`) ?? flag(name);

let changed = 0;
const reject = (what, value, shape) => {
  console.error(`--${what} "${value}" is not a ${shape}.`);
  process.exit(1);
};

for (const { node, prefix } of blocks) {
  const d1 = valueFor(prefix, 'd1');
  if (d1) {
    if (!UUID.test(d1)) reject(`${prefix}d1`, d1, 'D1 database id (a UUID)');
    node.d1_databases[0].database_id = d1;
    changed += 1;
  }
  for (const [binding, name] of [['KV', 'kv'], ['CATALOGUE_KV', 'catalogue-kv']]) {
    const id = valueFor(prefix, name);
    if (!id) continue;
    if (!HEX32.test(id)) reject(`${prefix}${name}`, id, 'KV namespace id (32 hex characters)');
    node.kv_namespaces.find((entry) => entry.binding === binding).id = id;
    changed += 1;
  }
  const bucket = flag('bucket');
  if (bucket) { node.r2_buckets[0].bucket_name = bucket; changed += 1; }
  const url = prefix ? flag('preview-url') : flag('site-url');
  if (url) {
    if (!/^https:\/\/[^/]+$/.test(url)) reject(prefix ? 'preview-url' : 'site-url', url, 'https URL with no trailing slash');
    node.vars.SITE_URL = url;
    changed += 1;
  }
}

if (!changed) {
  console.error('Nothing to do. Pass at least one of --d1 --kv --catalogue-kv --bucket --site-url --preview-url.');
  process.exit(1);
}

await fs.writeFile(FILE, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Updated ${changed} value${changed === 1 ? '' : 's'} in wrangler.jsonc.\n`);
show();

const prodDb = config.d1_databases[0].database_id;
if (prodDb === config.env.preview.d1_databases[0].database_id) {
  console.log('\nNote: preview and production share one D1 database, so test orders');
  console.log('will appear in your real orders table. Pass --preview-d1 <id> to split them.');
}
