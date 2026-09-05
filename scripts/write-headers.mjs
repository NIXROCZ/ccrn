import fs from 'node:fs/promises';
import path from 'node:path';
const turnstile = process.env.PUBLIC_TURNSTILE_SITE_KEY;
const beacon = process.env.PUBLIC_CF_BEACON_TOKEN;
const csp = `default-src 'self'; script-src 'self'${turnstile ? ' https://challenges.cloudflare.com' : ''}${beacon ? ' https://static.cloudflareinsights.com' : ''}; style-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self'${beacon ? ' https://cloudflareinsights.com' : ''};${turnstile ? ' frame-src https://challenges.cloudflare.com;' : ''} frame-ancestors 'none'; form-action 'self' https://checkout.stripe.com; base-uri 'self'; object-src 'none'; upgrade-insecure-requests`;
const headers = `/*\n  Content-Security-Policy: ${csp}\n  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload\n  X-Frame-Options: DENY\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Cross-Origin-Opener-Policy: same-origin\n`;
await fs.mkdir(path.join(process.cwd(), 'public'), { recursive: true });
await fs.writeFile(path.join(process.cwd(), 'public/_headers'), headers);
await fs.writeFile(path.join(process.cwd(), 'src/lib/security-headers.ts'), `export const contentSecurityPolicy = ${JSON.stringify(csp)};\nexport const securityHeaders = { 'Content-Security-Policy': contentSecurityPolicy, 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cross-Origin-Opener-Policy': 'same-origin' };\n`);
