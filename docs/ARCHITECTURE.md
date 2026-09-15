# Raising Noble — architecture

Raising Noble sells downloadable family-education kits (AUD $35 each) from Wollongong, Australia.
Everything runs on one Cloudflare Worker: Astro prerenders the catalogue to static HTML, and the same
Worker serves the API (Stripe Checkout, Stripe webhooks, gift-card ledger, magic-link download access,
watermarked downloads, Resend email, contact + newsletter). Catalogue changes are checked through an
authenticated sync endpoint rather than a Cloudflare Cron Trigger.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Astro 5 (static prerender), vanilla TypeScript islands, self-hosted fonts (`@fontsource/*`) |
| Runtime | Cloudflare Worker via `@astrojs/cloudflare`, Workers Static Assets |
| Data | D1 (`DB`) orders / grants / gift cards / subscribers; KV (`KV`) rate limits, magic-link tokens, sessions, sync state |
| Files | R2 bucket `raising-noble-kits` (`KITS` binding) — `kits/<slug>/kit.zip`, `kits/<slug>/kit.json`, optional `kits/<slug>/cover.webp` |
| Payments | Stripe Checkout (cards + wallets, AUD, inline `price_data`), webhook-confirmed |
| Email | Resend REST API |
| Bot protection | Cloudflare Turnstile (optional, enabled when keys are set) |
| Analytics | Cloudflare Web Analytics beacon (optional, cookieless) — no consent banner |

## Cloudflare resources (already created in the account)

| Resource | Binding | Name | ID |
| --- | --- | --- | --- |
| D1 | `DB` | `raising-noble` | `5a99511d-8046-43a4-9a26-c94c77354baa` |
| KV | `KV` | `raising-noble-kv` | `513fec7d089d45f8961addde1f6161db` |
| KV | `CATALOGUE_KV` | `raising-noble-catalogue` | `006ec100a9e648a09343de0944f0fdbf` |
| R2 | `KITS` | `raising-noble-kits` | R2 must be enabled in the dashboard first, then create this bucket |

## Catalogue model

`src/data/kits.base.json` holds all 15 kit slots (3 collections × 5). Every kit starts `status: "coming_soon"`.

Collections / categories (id → label → collection name):

- `food` → Food & Nutrition → **Nourishing With Knowledge**: `seedoils`, `sugar`, `labels`, `processed`, `hunger`
- `safety` → Safety & Wellbeing → **Safe & Strong**: `bodysafety`, `feelings`, `online`, `speakup`, `emergencies`
- `home` → Home & Environment → **Hidden Home Influences**: `plastics`, `water`, `waste`, `chemicals`, `screens`

Kit fields: `id, cat, title, coverTitle, coverLine1, coverLine2, blurb, learn[4][title, text], ages {min,max}, motif, best?, sensitive?, status, files[]`.

Age bands (filter, five bands covering 0–15): `0-3`, `4-6`, `7-9`, `10-12`, `13-15`. A kit matches a band when
its `[ages.min, ages.max]` range overlaps the band.

### Auto-publish pipeline ("rebuild on upload")

1. Owner uploads `kits/<slug>/kit.zip` and `kits/<slug>/kit.json` (and optionally `cover.webp`) to R2.
2. An external scheduler calls `POST /api/internal/sync` with the `SYNC_TOKEN` secret as a
   Bearer token. The endpoint lists `kits/` in R2, hashes `(key, etag)` pairs, compares with
   `KV:catalogue:manifest-hash`, and on change stores the new hash and POSTs the Workers Builds
   deploy hook (`DEPLOY_HOOK_URL` secret). Cloudflare Cron Triggers are intentionally not used.
   The owner can also trigger a rebuild from Workers Builds after an upload.
3. The build (`npm run build`) runs `scripts/sync-catalogue.mjs` first. With `CLOUDFLARE_API_TOKEN` +
   `CLOUDFLARE_ACCOUNT_ID` in build env it lists the bucket through the Cloudflare REST API, downloads every
   `kit.json` (and covers to `public/covers/<slug>.webp`), merges onto `kits.base.json` and writes
   `src/generated/catalogue.json`. A kit becomes `status: "available"` only when `kit.zip` exists.
   New slugs not in the base file are appended (category must be valid). Without credentials the script
   copies the base file unchanged, so the build never fails.
4. Pages, cart, checkout validation and the download endpoint all import `src/generated/catalogue.json`.

`kit.json` schema (all optional except `title`; overrides the base entry):

```json
{
  "title": "Seed Oils Kit",
  "cat": "food",
  "coverTitle": "Seed Oils",
  "coverLine1": "...", "coverLine2": "...",
  "blurb": "...",
  "learn": [["What Seed Oils Are", "..."], ["...", "..."], ["...", "..."], ["...", "..."]],
  "ages": { "min": 5, "max": 12 },
  "files": ["Presentation (PPTX)", "Parent guide (PDF)", "Viewing guide (PDF)", "Activity 1 (PDF)", "Activity 2 (PDF)"],
  "sensitive": false
}
```

## Pricing rules (single source: `src/lib/pricing.ts`)

- `KIT_PRICE_CENTS = 3500` (AUD). Kits are quantity 1 per order.
- Bundle: when an order contains **every currently available kit**, 30% off the kit subtotal
  (`BUNDLE_DISCOUNT = 0.30`). The "Complete Bundle" button just adds all available kits.
- Gift cards: presets 35 / 50 / 100 / 200, custom 10–500 AUD, whole dollars. Gift-card value is never discounted.
- Gift-card redemption: applied after the bundle discount, up to the order total, across up to 3 codes.
  Never applies to the purchase of another gift card.
- Sells worldwide. Checkout collects a billing address and the country is recorded on the order.
  It is no longer gated on: an earlier rule refunded any paid order whose billing country was not
  `AU`, which charged an overseas buyer and immediately reversed it. That rule is gone; every paid
  order is fulfilled. `refunded_non_au` is still recognised so historical rows stay readable, but
  nothing produces it.
- Currency: AUD only, charged in AUD wherever the buyer is. Their card issuer converts.
- Tax: **Stripe Tax is off and no tax is collected on any sale.** That was defensible while the
  store sold only to Australia and the seller was not GST-registered. Selling digital products
  internationally is different — the EU, the UK and a number of other jurisdictions require a
  foreign seller to register and collect VAT or GST on consumer sales, in several cases from the
  first sale with no threshold. Turning Stripe Tax on is a prerequisite for selling into those
  markets, not an optimisation. See docs/GOING-INTERNATIONAL.md.

## Gift cards (D1 ledger)

- Code: 10 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I), generated with `crypto.getRandomValues`,
  displayed as `XXXXX-XXXXX`, matched case-insensitively with dashes/spaces stripped.
- Stored as `code_hash = SHA-256(SITE_PEPPER + normalised code)`; only `code_last4` is kept in clear.
- `balance_cents` is the spendable balance; `reserved_cents` is held for pending checkouts.
- Reserve at session creation with a single conditional `UPDATE ... WHERE balance_cents - reserved_cents >= ?`;
  on `checkout.session.completed` move reserved → spent; on `checkout.session.expired` / cancel release.
- Gift cards do not expire (Australian law requires ≥ 3 years; we simply never expire them).
- If gift balance covers the whole order, no Stripe session is created: the order is finalised immediately.
- Otherwise the applied amount becomes a single-use Stripe coupon (`amount_off`, AUD) attached to the session.

## Orders, delivery, magic links

- `POST /api/checkout` validates the cart against the catalogue, inserts a `pending` order, reserves gift
  balance, creates the Stripe Checkout Session (`client_reference_id = order id`, `metadata.order_id`),
  returns `{ url }`.
- `POST /api/webhooks/stripe` verifies `Stripe-Signature` (HMAC-SHA256, 5-minute tolerance), dedupes by
  `stripe_events.id`, then on `checkout.session.completed` with `payment_status = paid`:
  - non-AU billing country → refund via Stripe API, order `refunded_non_au`, email the buyer, stop;
  - mark order `paid`, create one `download_grants` row per kit, create gift cards for gift lines, send
    receipt email (with download link) and gift-card emails.
- Buyer access is by email only (no passwords). `POST /api/magic-link` emails a link
  `/downloads/verify?token=…` (32 random bytes, hash stored in KV, 15-minute TTL, single use).
  Verifying sets `__Host-rn_session` (HttpOnly, Secure, SameSite=Lax, 30 days; session record in KV).
- `/checkout/success?session_id=…` retrieves the Stripe session server-side; if paid, it signs the buyer in
  for that email and shows the downloads immediately.
- `/downloads` (SSR) lists the buyer's kits, remaining downloads, and gift-card balances they purchased.
- `GET /api/download/:kitId` checks session + grant, enforces the cap (`DOWNLOAD_CAP = 10` per kit per rolling
  30 days), logs the download (hashed IP), and streams the ZIP from R2 with a personalised
  `LICENCE.txt` appended (buyer email, order number, date, licence terms). The appender reads only the
  central directory via range requests and streams the original bytes, so large kits never load into memory.
  ZIP64 archives are streamed unmodified.

## Security controls

- Strict CSP from `public/_headers` (static) and `src/middleware.ts` (dynamic): `default-src 'self'`,
  no inline scripts (`vite.build.assetsInlineLimit = 0`, `build.inlineStylesheets = 'never'`),
  Turnstile + Cloudflare Insights origins only when enabled. HSTS (preload), `X-Frame-Options: DENY`,
  `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, COOP.
- All mutating API routes require `Origin` to match `SITE_URL` and `Content-Type: application/json`; bodies
  validated with zod; sizes capped.
- KV sliding-window rate limits per hashed IP on checkout, gift-check, magic-link, contact, newsletter,
  download. Turnstile on contact / newsletter / magic-link when configured.
- Secrets only in Worker secrets; never logged. Emails and IPs are hashed in logs.
- Cookies: only the essential session cookie. Cart lives in `localStorage`. No third-party trackers.

## Email (Resend) — templates in `src/lib/email/`

receipt + downloads, gift card (to recipient or purchaser), magic link, contact-form relay to
`CONTACT_TO_EMAIL`, newsletter confirm (double opt-in) + unsubscribe link, kit-available notification,
non-AU refund notice.

## Environment

Vars (wrangler.jsonc `vars`): `SITE_URL`, `FROM_EMAIL`, `ORDERS_EMAIL`, `CONTACT_TO_EMAIL`, `PUBLIC_TURNSTILE_SITE_KEY?`, `PUBLIC_CF_BEACON_TOKEN?`.
Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SITE_PEPPER`, `SYNC_TOKEN`, `DEPLOY_HOOK_URL`, `TURNSTILE_SECRET_KEY?`.
Build env (Workers Builds → Variables): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
