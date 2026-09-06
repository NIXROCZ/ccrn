import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { contentSecurityPolicy } from '../lib/security-headers';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.astro$/.test(path)) out.push(path);
  }
  return out;
}

describe('content security policy compliance', () => {
  it('has no inline style attribute in any template', () => {
    // `style-src 'self'` blocks inline style attributes outright, so one of
    // these does not fail loudly — it silently drops the styling in production.
    if (/style-src[^;]*'unsafe-inline'/.test(contentSecurityPolicy)) return;

    const offenders: string[] = [];
    for (const file of walk(new URL('../', import.meta.url).pathname)) {
      const source = readFileSync(file, 'utf8');
      // Ignore `set:html` and Astro expressions that merely mention the word.
      const matches = source.match(/\sstyle=["{]/g);
      if (matches) offenders.push(`${file.split('/src/')[1]} (${matches.length})`);
    }
    expect(offenders, `inline styles would be blocked by the CSP: ${offenders.join(', ')}`).toEqual([]);
  });
});
