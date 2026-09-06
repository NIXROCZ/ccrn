import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { contentSecurityPolicy, securityHeaders } from './security-headers';

const headersFile = readFileSync(new URL('../../public/_headers', import.meta.url), 'utf8');

describe('security headers', () => {
  it('sends the same policy to static assets and rendered routes', () => {
    // Both files are generated from one source in scripts/write-headers.mjs.
    // This is the check that the generator actually ran before the build.
    for (const [name, value] of Object.entries(securityHeaders)) {
      expect(headersFile, `_headers is missing or differs on ${name}`).toContain(`${name}: ${value}`);
    }
  });

  it('forbids the things that matter', () => {
    expect(contentSecurityPolicy).toContain("default-src 'self'");
    expect(contentSecurityPolicy).toContain("frame-ancestors 'none'");
    expect(contentSecurityPolicy).toContain("object-src 'none'");
    expect(contentSecurityPolicy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(contentSecurityPolicy).not.toMatch(/script-src[^;]*'unsafe-eval'/);
  });

  it('covers the headers a storefront needs', () => {
    for (const name of [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'X-Frame-Options',
      'Cross-Origin-Opener-Policy',
      'Cross-Origin-Resource-Policy',
      'Permissions-Policy',
    ]) {
      expect(securityHeaders, `missing ${name}`).toHaveProperty(name);
    }
  });

  it('never caches per-customer routes', () => {
    for (const route of ['/downloads', '/api/*']) {
      const block = headersFile.split(route)[1]?.slice(0, 200) ?? '';
      expect(block, `${route} must not be cached`).toContain('Cache-Control: no-store');
    }
  });
});
