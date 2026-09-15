# Go live: Raising Noble, start to finish

Written for someone who has never deployed a website. Every step says what to
click, what to paste, and how to tell it worked before you move on.

Do them in order. The order matters — DNS has to be working before email can
verify, and email has to verify before an order confirmation can send.

Budget about **90 minutes of your attention**, spread over **1–2 days** of
waiting for DNS.

---

## First, the question you asked

> Can I transfer the D1 database, the two KV namespaces and the R2 bucket to
> the new Raising Noble Cloudflare account?

**No. Cloudflare has no way to move them between accounts.** There is no
transfer button, no API call, and no support request that does it. Domains can
move between Cloudflare accounts; storage cannot.

**This costs you nothing, because there is nothing worth moving:**

| Resource | What is in it today | Verdict |
|---|---|---|
| D1 `raising-noble` | 1 abandoned pending order, 0 gift cards, 0 customers, 0 subscribers | Recreate. Migrations rebuild it in 10 seconds. |
| KV × 2 | rate-limit counters, login tokens, a cache | Recreate. All of it is disposable by design. |
| R2 `raising-noble-kits` | the kit ZIPs | Re-upload — you have the files on your machine anyway. |

So: **create fresh in the new account.** That is both the only option and the
one you would pick regardless. Recreating is Part 2 below and takes 5 minutes.

One real consequence: **`SITE_PEPPER` must be generated once and never
changed.** It is the secret that hashes gift-card codes. Change it later and
every gift card in circulation stops working. Generate it in Part 7, save a
copy in your password manager, and never touch it again.

---

## What already exists (so you know what you are *not* redoing)

I checked all three accounts. Current state:

| | Status |
|---|---|
| **Code** | Healthy. Builds clean, 44 tests pass, linter clean. |
| **Cloudflare (old `nixrocz` account)** | Everything live: D1 with both migrations applied, 2 KV, R2 bucket, preview Worker. This is what you are leaving behind. |
| **Cloudflare (new Raising Noble account)** | Nothing yet. Part 2. |
| **Resend** | `raisingnoble.com` added but status **failed** — the DNS records were never published. Part 5 fixes it. |
| **Stripe** | Test mode. **Zero webhook endpoints.** Right now a paid order would never be fulfilled. Part 6 fixes it. |
| **Domain** | At Squarespace. Part 4 points it at Cloudflare. |

---

## Part 1 — Get the code onto your machine

You need [Node.js](https://nodejs.org) (take the LTS button) and a terminal.

```bash
git clone https://github.com/NIXROCZ/ccrn.git raising-noble
cd raising-noble
npm ci
npm test
```

**Check:** the last line says `Tests  44 passed (44)`. If it does, the code is
sound and every problem from here on is an account-configuration problem, not a
code problem. That distinction will save you hours.

---

## Part 2 — Create the Cloudflare resources

Sign in to the **new Raising Noble account** at
[dash.cloudflare.com](https://dash.cloudflare.com).

### 2.1 Turn on R2 once

Dashboard → **R2** → **Enable**. It asks for a card even though you will not be
charged: 430 MB sits inside the 10 GB free tier, and **R2 never charges for
downloads**, which is precisely why the kits live there.

### 2.2 Sign the terminal into the new account

```bash
npx wrangler login      # a browser opens — pick the Raising Noble account
npx wrangler whoami     # confirm it says Raising Noble, not the old account
```

Do not skip `whoami`. Creating everything in the wrong account is the single
most common way to lose an afternoon here.

### 2.3 Create the four resources

```bash
npx wrangler d1 create raising-noble
npx wrangler kv namespace create KV
npx wrangler kv namespace create CATALOGUE_KV
npx wrangler r2 bucket create raising-noble-kits
```

Each prints an id. **Copy all three ids into a scratch file now** — the D1 one
looks like `a1b2c3d4-….`, the KV ones are 32 characters of hex.

### 2.4 Put the ids into the config

Each id has to appear in `wrangler.jsonc` **twice** — once for production, once
for preview. Forgetting the second one is how test orders end up in your real
sales table. Use the script instead of editing by hand:

```bash
node scripts/set-bindings.mjs \
  --d1 <D1 id from 2.3> \
  --kv <KV id from 2.3> \
  --catalogue-kv <CATALOGUE_KV id from 2.3>
```

It rejects a malformed id rather than writing it, then prints both blocks back
so you can see they match.

**Check:**

```bash
node scripts/set-bindings.mjs --check
npx wrangler deploy --dry-run
```

The dry run must finish without complaining about a binding.

### 2.5 Build the database tables

```bash
npx wrangler d1 migrations apply raising-noble --remote
```

**Check:**

```bash
npx wrangler d1 execute raising-noble --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

You should see `orders`, `download_grants`, `downloads`, `gift_cards`,
`gift_redemptions`, `stripe_events`, `subscribers`, `contact_messages`.

---

## Part 3 — Upload the fifteen kits

You said you have the ZIPs. Put all fifteen in one folder, each named after its
kit id — `seed-oils.zip`, `refined-sugar.zip`, and so on. The full id list is in
`docs/CLOUDFLARE-SETUP.md` §1.1.

**The filename is the product id.** A typo here means a paying customer gets an
error, so the script refuses to upload anything until all fifteen are present
and every archive passes an integrity check.

```bash
./scripts/upload-kits.sh ~/raising-noble-kits
```

It uploads, then reads every key back and prints `ok` or `FAILED` per kit.
Re-running is safe. Expect a few minutes for ~430 MB.

**Check:** fifteen `ok` lines and nothing else.

> **Strip macOS junk first**, or buyers see it inside the ZIP:
> ```bash
> cd ~/raising-noble-kits
> for f in *.zip; do zip -d "$f" "__MACOSX/*" "*.DS_Store" 2>/dev/null || true; done
> ```

> **Known gap.** A kit's on-sale status is meant to flip to "coming soon"
> automatically when its file is missing, but that check reads a `kit.json` in
> R2 which you probably do not have. Without it, `src/data/kits.base.json`
> decides — and it marks all fifteen as available. So **upload all fifteen
> before you deploy**, or the shop will offer a kit it cannot deliver. The
> script now uploads an optional `<id>.json` if you put one beside the ZIP.

---

## Part 4 — The domain

You chose: **nameservers now, transfer the registration later.** That is the
right call. Moving nameservers takes an hour and is reversible; moving the
registration takes 5–7 days and Squarespace blocks it for 60 days after purchase
anyway.

To be clear about what this does: **Squarespace stays your registrar** (you keep
paying them the yearly renewal), but **Cloudflare becomes your DNS**, which is
all that is needed to host the site and send email.

### 4.1 Add the domain to Cloudflare

Dashboard → **Add a site** → type `raisingnoble.com` → choose the **Free** plan.

Cloudflare scans your existing DNS and shows you two nameservers, something like:

```
gina.ns.cloudflare.com
rick.ns.cloudflare.com
```

Yours will be different names. Copy both.

### 4.2 Point Squarespace at them

Squarespace → **Domains** → `raisingnoble.com` → **DNS** → **Nameservers** →
switch from *Squarespace defaults* to **Custom nameservers** → paste both →
Save.

### 4.3 Wait

Usually 10–60 minutes, occasionally a few hours. Cloudflare emails you when the
domain goes **Active**, and the overview page shows it too.

**Check:** the Cloudflare dashboard shows `raisingnoble.com` as **Active**. Do
not continue to Part 5 until it does — the email records cannot verify against
nameservers that have not switched.

### 4.4 Turn on inbound email

Resend **sends** mail but cannot **receive** it. Your site tells customers to
write to `hello@raisingnoble.com`, so that address has to land somewhere.

Cloudflare → your domain → **Email** → **Email Routing** → **Get started**.
Create these forwards to whatever inbox you actually read:

| Address | Forward to |
|---|---|
| `hello@raisingnoble.com` | your real inbox |
| `orders@raisingnoble.com` | your real inbox |
| `privacy@raisingnoble.com` | your real inbox |

Cloudflare adds the needed MX records itself. Free, and live in about five
minutes.

**Check:** send yourself a mail at `hello@raisingnoble.com` and watch it arrive.

> These do not clash with Resend. Cloudflare's MX records sit on the root
> `raisingnoble.com`; Resend's sit on the `send` subdomain. Different names,
> no conflict.

---

## Part 5 — Resend (the emails)

The domain is already registered in Resend but shows **failed**, because its
three DNS records were never published. Now that Cloudflare runs your DNS, add
them.

Resend → **Domains** → `raisingnoble.com`. It shows three records. Add each one
in Cloudflare → your domain → **DNS** → **Add record**:

| Type | Name | Value | Priority |
|---|---|---|---|
| TXT | `resend._domainkey` | the long `p=MIGf…` string Resend shows | — |
| MX | `send` | `feedback-smtp.ap-northeast-1.amazonses.com` | `10` |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |

**Copy the DKIM value from the Resend dashboard, not from here.** It is ~400
characters and a single wrong character fails verification silently.

Then add one more that Resend does not ask for but that keeps you out of spam
folders:

| Type | Name | Value |
|---|---|---|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:hello@raisingnoble.com` |

Leave `p=none` for a fortnight, then tighten to `p=quarantine`.

Back in Resend, press **Verify**.

**Check:** the domain shows **Verified** in green. Usually minutes. Nothing
emails until it does — no receipts, no download links, no contact form.

### 5.1 The API key

Resend → **API keys** → **Create**. Name it `raising-noble-production`,
permission **Sending access** only — never full access on a website. Copy the
key. **It is shown once.** Paste it into your scratch file; it goes into Part 7.

---

## Part 6 — Stripe (the money)

**Do not create any products or prices.** Every amount lives in
`src/lib/pricing.ts` — $35 a kit, $89 for any three — and the Worker builds each
checkout line on the fly. Prices created in Stripe are simply never read.

Stay in **test mode** for now. The toggle is top-right of the Stripe dashboard.

### 6.1 The secret key

**Developers → API keys** → reveal the **Secret key** (`sk_test_…`). Copy it.

### 6.2 Payment methods

**Settings → Payments → Payment methods.** Turn on **Apple Pay**, **Google
Pay** and **Link**. These roughly halve checkout abandonment on phones.

### 6.3 The webhook — the step that actually delivers the product

Without this, a customer pays and **nothing happens**. No email, no download,
no order record. It is the single most important setting in this document.

**Developers → Webhooks → Add endpoint.**

- **URL:** `https://raisingnoble.com/api/webhooks/stripe`
- **Events** — tick exactly these four, the only four the code acts on:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `checkout.session.expired`

Add it, then copy the **Signing secret** (`whsec_…`) into your scratch file.

**Check later:** after Part 10, every delivery in this screen reads 200. A 4xx
means the signing secret is wrong.

---

## Part 7 — The secrets

Six values, set on the Worker, never in the repo.

First generate two of them:

```bash
openssl rand -hex 32     # this is SITE_PEPPER  — save a copy forever
openssl rand -hex 32     # this is SYNC_TOKEN
```

Then set all six, pasting each value when prompted:

```bash
npx wrangler secret put STRIPE_SECRET_KEY        # sk_test_… from 6.1
npx wrangler secret put STRIPE_WEBHOOK_SECRET    # whsec_…   from 6.3
npx wrangler secret put RESEND_API_KEY           # re_…      from 5.1
npx wrangler secret put SITE_PEPPER              # first openssl output
npx wrangler secret put SYNC_TOKEN               # second openssl output
npx wrangler secret put DEPLOY_HOOK_URL          # press enter to skip
```

**Check:** `npx wrangler secret list` shows five or six names.

> **`SITE_PEPPER` is the one you cannot lose and cannot change.** It hashes
> every gift-card code. Change it and every card ever sold stops working. Put it
> in your password manager now.

---

## Part 8 — Deploy

```bash
npm run build
npx wrangler deploy
```

**Check:** it prints a `…workers.dev` URL. Open it. The shop should list twenty
kits — fifteen buyable, five marked coming soon.

### 8.1 Then make it deploy itself

So you never have to run that again: Cloudflare → **Workers & Pages** → your
worker → **Settings** → **Build** → **Connect to Git** → authorise GitHub →
pick `NIXROCZ/ccrn` → branch `main`.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

Add two **build variables** so the catalogue can read R2 during builds:
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (**My Profile → API Tokens →
Create Token → Edit Cloudflare Workers**).

From then on, every push to `main` deploys itself — including anything I change
for you.

---

## Part 9 — Point the domain at the Worker

Cloudflare → **Workers & Pages** → your worker → **Settings** → **Domains &
Routes** → **Add custom domain** → `raisingnoble.com`.

Add `www.raisingnoble.com` the same way if you want it to work too.

Cloudflare creates the DNS record and issues the certificate itself — a minute
or two.

**Check:** `https://raisingnoble.com` loads the shop with a padlock.

---

## Part 9.5 — Ask the deployment whether it is wired up

Before testing by hand, ask the Worker directly. A Worker with a missing secret
or an empty bucket looks perfectly healthy from outside: pages render, the shop
lists kits, nothing errors. It fails at the worst moment — a customer pays, the
webhook signature check fails, and no email and no download ever arrive.

```bash
SYNC_TOKEN=<the token from Part 7> npm run health -- https://raisingnoble.com
```

It reports, line by line:

- every required secret — set or missing (presence only; no value is returned)
- whether your Stripe key is a **test** or **live** key
- D1 reachable, with both migrations applied
- KV written and read back
- **every sellable kit checked against the bucket**, naming any that are missing
- `SITE_URL` matching the host actually serving the request, because that value
  is what every emailed link is built from

Exit code 0 means ready. Anything else prints exactly what is wrong.

**Run it again after any change to secrets, after uploading kits, and after
pointing the custom domain.** It is the fastest way to know a deploy is sound,
and it stays useful long after launch.

---

## Part 10 — Prove it works before taking real money

Still in Stripe **test** mode. Do all nine.

1. Shop lists **twenty** kits, five marked coming soon.
2. Add **three** to the cart. Total reads **$89.00**, not $105.
3. Add a **fourth**. Total reads **$124.00**.
4. Check out with card `4242 4242 4242 4242`, any future expiry, any CVC.
5. **The receipt email arrives.**  ← this proves Resend
6. Download a kit. It opens, and contains a `LICENCE.txt` with your email and
   order number.  ← this proves R2 and the webhook
7. Buy a gift card. Check its balance at `/gift-card#balance`. Expiry is three
   years out.
8. Redeem it against a kit order; the credit comes off the total.
9. Submit the contact form; it arrives at your inbox.

Then confirm the money maths landed in the database:

```bash
npx wrangler d1 execute raising-noble --remote \
  --command "SELECT order_number, status, kit_subtotal_cents, bundle_discount_cents, total_cents FROM orders ORDER BY rowid DESC LIMIT 5"
```

A three-kit order must read subtotal `10500`, discount `1600`, total `8900`.

And check **Stripe → Developers → Webhooks**: every delivery 200.

**If any one of these nine fails, stop.** The table at the bottom of
`docs/CLOUDFLARE-SETUP.md` maps each symptom to its cause.

---

## Part 11 — Go live

Only once all nine passed.

1. Stripe: flip the dashboard toggle from **Test** to **Live**.
2. Complete Stripe account activation — business details, ABN, bank account.
3. **Developers → API keys** → copy the **live** secret key (`sk_live_…`).
4. **Developers → Webhooks** → add the same endpoint again, with the same four
   events. Live mode has its own endpoints and its own signing secret.
5. Update both secrets and redeploy:

   ```bash
   npx wrangler secret put STRIPE_SECRET_KEY       # sk_live_…
   npx wrangler secret put STRIPE_WEBHOOK_SECRET   # the LIVE whsec_…
   npx wrangler deploy
   ```

6. Buy one cheap kit with your own real card. Confirm the email and download.
   Refund yourself in Stripe afterwards.

You are open.

---

## Before you advertise

- [ ] Read `/terms`, `/privacy` and `/refunds` end to end. They describe how the
      site genuinely behaves. If you change behaviour, change them.
- [ ] Seller identity on those pages comes from `src/data/seller.ts` — one file,
      both pages. Currently: *Raising Noble, Wollongong NSW, Australia. Contact
      hello@raisingnoble.com.*
- [ ] **GST.** The site states Raising Noble is not registered and charges none.
      Registration is compulsory above $75,000 turnover in twelve months and
      **you have to watch that yourself.** When you register, three things change
      together: the wording in `/terms`, Stripe Tax switched on, and prices set
      tax-inclusive.
- [ ] Split preview off production before real orders arrive — see the section
      in `docs/HANDOVER.md`. Right now both write to the same database.
- [ ] Have a solicitor read the legal pages. They follow current Australian
      Consumer Law and Privacy Act requirements, but that is not legal advice.

---

## Running costs

| | Free allowance | You |
|---|---|---|
| Workers | 100k requests/day | far under |
| R2 storage | 10 GB | 430 MB |
| R2 downloads | free, unlimited | the whole reason kits live there |
| D1 | 5 GB, 5M reads/day | tiny |
| Resend | 3,000 emails/month | fine until thousands of orders |
| Cloudflare DNS | free | — |
| Stripe | — | 1.75% + A$0.30 per domestic card charge |

Effectively: **Stripe's cut, and the domain renewal.** Nothing else until you
are selling well.

---

## When something breaks

`npx wrangler tail` streams live Worker logs. Leave it running in one terminal
and reproduce the problem in a browser.

The symptom-to-cause table at the bottom of `docs/CLOUDFLARE-SETUP.md` covers
the failures that actually happen: 503 on download, 404 on download, no emails,
paid-but-nothing-happened, gift code not recognised.
