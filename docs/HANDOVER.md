# Moving Raising Noble to your own accounts

Everything in the repo is wired to placeholders and to the Cloudflare resources
this preview was built against. This is the order to swap them for your own
Cloudflare, Resend and Stripe accounts.

Nothing here needs a developer. Each step says what to change and how to tell it
worked.

---

## What is currently pointed where

| Thing | Current value | Where |
|---|---|---|
| Worker (production) | `raising-noble` | `wrangler.jsonc` → `name` |
| Worker (preview) | `raising-noble-preview` | `wrangler.jsonc` → `env.preview.name` |
| D1 database | `5a99511d-8046-43a4-9a26-c94c77354baa` | `wrangler.jsonc` (twice — root and `env.preview`) |
| KV | `513fec7d089d45f8961addde1f6161db` | `wrangler.jsonc` (twice) |
| Catalogue KV | `006ec100a9e648a09343de0944f0fdbf` | `wrangler.jsonc` (twice) |
| R2 bucket | `raising-noble-kits` | `wrangler.jsonc` (twice) |
| Site URL | `https://raisingnoble.com` | `wrangler.jsonc` → `vars.SITE_URL` |
| From address | `orders@raisingnoble.com` | `wrangler.jsonc` → `vars.FROM_EMAIL` |

**No secret is committed.** `.dev.vars.example` lists every one; the real values
live only as Worker secrets.

---

## 1. Cloudflare

Create the resources in the new account, then paste the new IDs into
`wrangler.jsonc`. The names can stay the same; only the IDs change.

```bash
npx wrangler login                      # the new account

npx wrangler d1 create raising-noble
npx wrangler kv namespace create KV
npx wrangler kv namespace create CATALOGUE_KV
npx wrangler r2 bucket create raising-noble-kits
```

Each command prints an ID. Put them into `wrangler.jsonc` — **in both places**,
the root block and the `env.preview` block, or the preview will keep writing to
the old database.

Then create the schema:

```bash
npx wrangler d1 migrations apply raising-noble --remote
```

**Check:** `npx wrangler d1 execute raising-noble --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"` lists the tables.

> R2 has to be enabled on the account before the bucket command works. If it
> errors, open the R2 section of the dashboard once and accept the terms.

---

## 2. Resend

1. Add `raisingnoble.com` under **Domains**.
2. Add the three DNS records it gives you (a DKIM `TXT`, an SPF `TXT` and an
   `MX`), then press **Verify**. This takes minutes, not hours.
3. Add a **DMARC** record too. Not required by Resend, but without one your mail
   is far more likely to land in spam:

   | Type | Name | Value |
   |---|---|---|
   | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:you@yourinbox.com` |

   Start at `p=none`, watch for a fortnight, then move to `p=quarantine`.
4. Create an API key with **sending access only**. Do not use a full-access key
   on a website.

**Check:** the domain shows **Verified**.

> Resend sends but does not receive. If you want replies to `hello@` to reach
> you, Cloudflare **Email Routing** forwards them to any existing inbox, free,
> in about five minutes.

---

## 3. Stripe

1. Activate the new account (business details and a bank account).
2. Create the products. Prices are read from Stripe, so this is what sets them.
3. **Developers → Webhooks → Add endpoint:**
   - URL: `https://<your-worker>.workers.dev/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`,
     `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`
   - Copy the signing secret (`whsec_…`). **Without it the endpoint refuses
     every event and no order is ever fulfilled.**

Use test keys (`sk_test_…`) until you have put a full order through.

---

## 4. Secrets

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put SITE_PEPPER
npx wrangler secret put SYNC_TOKEN
```

`SITE_PEPPER` salts gift-card and token hashes. Generate it properly:

```bash
openssl rand -base64 48
```

Changing it later invalidates outstanding download links and gift-card lookups,
so set it once and keep it.

Optional: `TURNSTILE_SECRET_KEY` and `PUBLIC_TURNSTILE_SITE_KEY` turn on bot
protection for the contact, newsletter and sign-in forms. The Content-Security-
Policy adapts automatically — `scripts/write-headers.mjs` adds the Turnstile
origins only when the key is set, so do not edit the CSP by hand.

---

## 5. Deploy

```bash
npm ci
npm run build
npx wrangler deploy --env preview     # → raising-noble-preview
npx wrangler deploy                   # → production, when ready
```

**Check:**

```bash
curl -sI https://<your-worker>.workers.dev | grep -i "content-security-policy\|strict-transport"
```

Both headers should come back.

---

## 6. Before taking real money

- [ ] Buy a kit with test card `4242 4242 4242 4242`, any future expiry, any CVC.
      Confirm the receipt arrives and the download works.
- [ ] Buy a gift card, redeem part of it, confirm the remaining balance is right
      and the code still works on a second order.
- [ ] Add a gift card **leaving the recipient email blank** — this used to block
      checkout and is now covered by a test, but confirm it on your own account.
- [ ] Abandon a checkout with a gift card applied; confirm the balance returns.
- [ ] Submit the contact form and confirm it arrives.
- [ ] Read `/terms`, `/privacy` and `/refunds` end to end. They describe how the
      site actually behaves; if you change the behaviour, change them.
- [ ] Confirm the GST position. The site says Raising Noble is **not registered
      for GST** and charges none. Registration becomes compulsory at $75,000
      turnover in twelve months, and you must watch that yourself. When you do
      register, three things change together: the wording in `/terms`, Stripe
      Tax switched on, and each Price set to tax-inclusive.
- [ ] Have a lawyer read the legal pages. They follow current Australian
      Consumer Law and Privacy Act requirements, but I am not your solicitor.

---

## 7. Publishing a kit

Upload to R2 under `kits/<id>/`, then redeploy. The build reads the bucket and
regenerates the catalogue, filters and bundle price.

A kit only goes on sale when it has **both** a file and a Stripe price. Anything
else shows as "Coming soon" and cannot be added to a cart — that is the safety
catch, so an accidental upload cannot put an unfinished kit on sale.

---

## Resources to delete

Two Cloudflare resources were created during development and are referenced by
nothing. Delete them so the account is clean:

- D1 database `343d4d33-b750-4ca0-b9b0-5fb03705a07e`
- KV namespace `9dd6871e55f64b37b19a1fb480467793`

The live bindings are the ones listed at the top of this document.
