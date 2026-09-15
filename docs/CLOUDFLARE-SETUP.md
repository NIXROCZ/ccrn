# Cloudflare setup and kit upload

Everything needed to take this repository from a fresh Cloudflare, Stripe and
Resend account to a live store with fifteen downloadable kits.

Work top to bottom. Every step ends with something you can check, so if a later
step misbehaves you know exactly which earlier one to look at.

---

## How a purchase actually flows

Worth holding in your head, because it tells you what has to exist:

```
Stripe Checkout  →  webhook  →  D1 records the order and what it entitles
                                        ↓
                       Resend emails a permanent library link
                                        ↓
              downloads stream from a private R2 bucket through the Worker
```

The kit files are never public. R2 has no public URL enabled; the Worker reads
the object, checks the buyer's entitlement in D1, appends a `LICENCE.txt`
stamped with their email and order number, and streams the result.

---

## Part 1 — Prepare the fifteen ZIPs

### 1.1 One ZIP per kit, named after its id

The download route reads `kits/<id>/kit.zip`, so **the id is the filename**.
Name each archive `<id>.zip` and the upload script does the rest.

| Kit | Archive to prepare | Uploads to |
|---|---|---|
| Seed Oils Kit | `seed-oils.zip` | `kits/seed-oils/kit.zip` |
| Refined Sugar Kit | `refined-sugar.zip` | `kits/refined-sugar/kit.zip` |
| Artificial Colours Kit | `artificial-colours.zip` | `kits/artificial-colours/kit.zip` |
| Artificial Flavours Kit | `artificial-flavours.zip` | `kits/artificial-flavours/kit.zip` |
| Preservatives Kit | `preservatives.zip` | `kits/preservatives/kit.zip` |
| EMFs Kit | `emfs.zip` | `kits/emfs/kit.zip` |
| Aluminium Kit | `aluminium.zip` | `kits/aluminium/kit.zip` |
| Forever Chemicals Kit | `forever-chemicals.zip` | `kits/forever-chemicals/kit.zip` |
| Microplastics Kit | `microplastics.zip` | `kits/microplastics/kit.zip` |
| Artificial Fragrances Kit | `artificial-fragrances.zip` | `kits/artificial-fragrances/kit.zip` |
| Getting Lost & Staying Safe Kit | `getting-lost.zip` | `kits/getting-lost/kit.zip` |
| Safe vs Unsafe Secrets Kit | `unsafe-secrets.zip` | `kits/unsafe-secrets/kit.zip` |
| Safe vs Unsafe Touch Kit | `unsafe-touch.zip` | `kits/unsafe-touch/kit.zip` |
| Personal Space & Body Consent Kit | `personal-space.zip` | `kits/personal-space/kit.zip` |
| Trusted Adults & Asking For Help Kit | `trusted-adults.zip` | `kits/trusted-adults/kit.zip` |

Put all fifteen in one folder, say `~/raising-noble-kits/`.

### 1.2 What goes inside each ZIP

The product pages list six documents, and the buyer sees that list before
paying, so match it. This is the structure of the archives already produced:

```
seed-oils.zip
├── 0. Seed Oils - Presentation.pptx    editable deck
├── 1. Seed Oils - Presentation.pdf     same deck, opens anywhere
├── 2. Activity 1.pdf
├── 3. Activity 2.pdf
├── 4. Parent and Carer Guide.pdf
├── 5. Viewing Guide.pdf
└── README.txt                          what is here, and how to use it
```

A folder inside the ZIP is fine too. What matters is that the six documents are
there and open. `README.txt` is a helper, not a deliverable, so it is not
counted in the "6 files" pill on the product page.

If you change this structure, change `files` in `src/data/kits.base.json` to
match. Describing contents the buyer does not receive is misleading conduct
under the Australian Consumer Law, quite apart from the support email it earns.

### 1.3 Three things to get right

**Zip the contents, not the enclosing folder.** On macOS, open the folder,
select the five files, then right-click → Compress. Selecting the folder itself
buries everything one level deeper.

**No `__MACOSX` or `.DS_Store`.** macOS adds these silently and buyers see them.
Strip them before uploading:

```bash
cd ~/raising-noble-kits
for f in *.zip; do zip -d "$f" "__MACOSX/*" "*.DS_Store" 2>/dev/null || true; done
```

**Keep each archive well under 4 GB.** At roughly 29 MB each this is automatic.
It matters because an archive that crosses into Zip64 format still downloads
perfectly but cannot have the per-buyer `LICENCE.txt` appended — the upload
script warns you if it sees one.

### 1.4 Check them before uploading

```bash
cd ~/raising-noble-kits
ls -la *.zip                       # expect 15 files, ~430 MB total
for f in *.zip; do unzip -tqq "$f" && echo "ok $f"; done
unzip -l seed-oils.zip             # eyeball one: five files, sensible names
```

Every archive must report `ok`. A corrupt ZIP uploads happily and fails in the
buyer's hands.

---

## Part 2 — Create the Cloudflare resources

### 2.1 Install and sign in

```bash
npm install
npx wrangler login          # opens a browser
npx wrangler whoami         # confirm the right account
```

If you have more than one Cloudflare account, note the **Account ID** shown —
you will need it in step 2.5.

### 2.2 Create the R2 bucket

R2 must be enabled once per account: Cloudflare dashboard → **R2** → *Enable*.
It asks for a payment method even on the free tier. 430 MB sits inside the 10 GB
free allowance, and **R2 charges nothing for egress**, which is the whole reason
the kits live there rather than anywhere else.

```bash
npx wrangler r2 bucket create raising-noble-kits
npx wrangler r2 bucket list
```

Leave public access **off**. The Worker is the only reader.

### 2.3 Create the D1 database

```bash
npx wrangler d1 create raising-noble
```

Copy the `database_id` it prints.

### 2.4 Create the two KV namespaces

```bash
npx wrangler kv namespace create KV
npx wrangler kv namespace create CATALOGUE_KV
```

Copy both ids.

### 2.5 Put the ids into `wrangler.jsonc`

Replace the placeholder ids in **both** the top-level block and the `preview`
block:

```jsonc
"d1_databases": [{ "binding": "DB", "database_name": "raising-noble",
                   "database_id": "<from 2.3>", "migrations_dir": "migrations" }],
"kv_namespaces": [
  { "binding": "KV",           "id": "<from 2.4>" },
  { "binding": "CATALOGUE_KV", "id": "<from 2.4>" }
],
```

Also set `SITE_URL` in `vars` to your real domain, and `FROM_EMAIL`,
`ORDERS_EMAIL` and `CONTACT_TO_EMAIL` to addresses on a domain you will verify
in Resend. (None of these are shown on the site — the contact form is the only
inbound channel — but they must be real for email to send.)

**Check:** `npx wrangler deploy --dry-run` completes without complaining about a
binding.

### 2.6 Apply the database migrations

```bash
npx wrangler d1 migrations apply raising-noble --remote
```

**Check:**

```bash
npx wrangler d1 execute raising-noble --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

You should see `orders`, `download_grants`, `downloads`, `gift_cards`,
`gift_redemptions`, `stripe_events` and friends. Confirm the expiry column
landed:

```bash
npx wrangler d1 execute raising-noble --remote \
  --command "SELECT name FROM pragma_table_info('gift_cards') WHERE name='expires_at'"
```

One row back means gift-card expiry is live.

---

## Part 3 — Upload the kits

### 3.1 Run the script

```bash
./scripts/upload-kits.sh ~/raising-noble-kits
```

It refuses to upload anything until all fifteen files are present and every
archive passes `unzip -t`, uploads each one, then reads every key back and
prints `ok` or `FAILED` per kit. At ~430 MB expect a few minutes on a normal
connection.

Re-running is safe. R2 overwrites by key, so if the connection drops halfway,
just run it again.

### 3.2 Or upload by hand

Dashboard → **R2** → `raising-noble-kits` → *Upload*. Create the folder path
`kits/seed-oils/` and upload the file **renamed to `kit.zip`**. Fifteen times.
The script exists because this step is where a typo costs you a support email
from a paying customer.

Single file from the CLI:

```bash
npx wrangler r2 object put raising-noble-kits/kits/seed-oils/kit.zip \
  --file ~/raising-noble-kits/seed-oils.zip \
  --content-type application/zip --remote
```

### 3.3 Verify all fifteen

```bash
npx wrangler r2 object get raising-noble-kits/kits/seed-oils/kit.zip \
  --file /tmp/check.zip --remote
unzip -l /tmp/check.zip
```

The listing should match what you zipped. If a kit is missing from R2, the site
does not 404 at a paying customer — the download route returns a 503 saying the
purchase is safe and the file is not ready yet — but no one should ever see it.

---

## Part 4 — Stripe

1. **Dashboard → Developers → API keys.** Copy the **secret** key. Use a test
   key (`sk_test_…`) until you have run a full test purchase.
2. **Settings → Payments** → enable Apple Pay, Google Pay and Link.
3. **Developers → Webhooks → Add endpoint:**
   - URL: `https://<your-domain>/api/webhooks/stripe`
   - Events — exactly these four, and nothing else:
     `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`
   - Copy the **signing secret** (`whsec_…`).

   Earlier drafts also listed `charge.refunded`. The handler in
   `src/pages/api/webhooks/stripe.ts` does not act on it — subscribing is
   harmless but does nothing, so leave it off and keep the list honest.

No products or prices need creating. The Worker builds line items per order, so
the three-for-$89 rule stays in one place in the code.

---

## Part 5 — Resend

1. **Domains → Add domain**, then add the DKIM, SPF and DMARC records it gives
   you to your DNS. If your DNS is on Cloudflare, set those records to
   **DNS only** (grey cloud), not proxied.
2. Wait for *Verified*. Nothing sends until it is.
3. **API keys → Create**, with send permission. Copy it.

`FROM_EMAIL` in `wrangler.jsonc` must be on the domain you just verified, or
every order confirmation bounces.

---

## Part 6 — Secrets

Never commit these. Set them on the Worker:

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put SITE_PEPPER      # openssl rand -hex 32
npx wrangler secret put SYNC_TOKEN       # openssl rand -hex 32
npx wrangler secret put DEPLOY_HOOK_URL  # optional
```

`SITE_PEPPER` hashes gift card codes and IP addresses. **Changing it later
invalidates every gift card in circulation**, so generate it once and keep a
copy somewhere safe.

For the preview environment add `--env preview` to each command.

**Check:** `npx wrangler secret list`

---

## Part 7 — Deploy

```bash
npm run build
npx wrangler deploy
```

Or connect the repo under **Workers & Pages → Create → Connect to Git**, with
build command `npm run build` and output directory `dist`.

To point a custom domain at it: **Worker → Settings → Domains & Routes → Add
custom domain**. Update `SITE_URL`, redeploy, and update the Stripe webhook URL
to match.

---

## Part 8 — Prove it end to end

Run this before announcing anything. Use a Stripe **test** key.

1. **The shop lists twenty kits**, fifteen with an Add to cart button and five
   Life Skills marked coming soon.
2. **Add three kits.** The cart total reads **$89.00**, not $105.
3. **Add a fourth.** Total reads **$124.00** — three at bundle price plus one
   at full price.
4. **Check out** with card `4242 4242 4242 4242`, any future expiry, any CVC.
5. **The order email arrives** with a library link.
6. **Download a kit.** The ZIP opens, and inside it there is a `LICENCE.txt`
   carrying your email and order number.
7. **Buy a gift card**, then check its balance on `/gift-card#balance`. The
   expiry shown should be three years out to the day.
8. **Redeem it** against a kit order and confirm the credit comes off the total.
9. **Confirm the order in D1:**

   ```bash
   npx wrangler d1 execute raising-noble --remote \
     --command "SELECT order_number, status, kit_subtotal_cents, bundle_discount_cents, total_cents FROM orders ORDER BY rowid DESC LIMIT 5"
   ```

   For a three-kit order: subtotal `10500`, discount `1600`, total `8900`.
10. **Check the webhook** in Stripe → Developers → Webhooks. Every delivery
    should be 200. A 4xx means `STRIPE_WEBHOOK_SECRET` is wrong.

Then swap the Stripe test key for the live key, redeploy, and do step 4 once
more with a real card for a small amount. Refund yourself afterwards.

---

## When something is wrong

| What you see | Where to look |
|---|---|
| Download returns 503 "not ready to download yet" | The ZIP is not in R2 under that exact key. Re-run part 3. |
| Download returns 404 | No paid grant for that email. Check `download_grants` in D1. |
| No emails | Resend domain not verified, or `FROM_EMAIL` is on a different domain. |
| Paid but nothing happened | Stripe webhook not delivering. Check the endpoint URL and signing secret. |
| Gift code "not recognised" | `SITE_PEPPER` changed after the card was issued. |
| Gift code "expired on …" | Working as intended — cards last three years. |
| Deploy fails on a binding | An id in `wrangler.jsonc` does not exist in this account. Re-run part 2. |

Worker logs: `npx wrangler tail`

---

## Running costs

At launch volumes all four sit inside free tiers.

| | Free allowance | This store |
|---|---|---|
| Workers | 100k requests/day | well under |
| R2 storage | 10 GB | 430 MB |
| R2 egress | unlimited, free | the reason kits live here |
| D1 | 5 GB, 5M reads/day | tiny |
| Resend | 3,000 emails/month | fine until you have thousands of orders |
| Stripe | — | 1.75% + A$0.30 per domestic card charge |
