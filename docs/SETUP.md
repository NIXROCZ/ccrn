# Raising Noble launch checklist

## Cloudflare

1. Connect this repository in Workers Builds.
2. Set the build command to `npm run build`.
3. Set the deploy command to `npx wrangler deploy`. Preview deploys use
   `npx wrangler deploy --env preview`; production deploys use `npx wrangler deploy`.
4. Set build variables `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
5. Enable R2 and create the `raising-noble-kits` bucket. Upload each kit under
   `kits/<slug>/kit.zip` with its `kit.json` (and optional `cover.webp`).
6. The D1 migration is already applied to the `raising-noble` database.
7. Add `raisingnoble.com` as the Worker custom domain. Later, change the Squarespace
   nameservers when the domain is ready to move.
8. Configure an external scheduler such as cron-job.org to call
   `POST https://raisingnoble.com/api/internal/sync` with `Authorization: Bearer <SYNC_TOKEN>`.

Set Worker secrets with:

```text
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put RESEND_API_KEY
wrangler secret put SITE_PEPPER
wrangler secret put SYNC_TOKEN
wrangler secret put DEPLOY_HOOK_URL
wrangler secret put TURNSTILE_SECRET_KEY
```

`TURNSTILE_SECRET_KEY` is optional. The public Turnstile site key, if used, is a build
variable named `PUBLIC_TURNSTILE_SITE_KEY`. `PUBLIC_CF_BEACON_TOKEN` is also optional.

## Stripe

1. Use an Australian Stripe account with AUD enabled.
2. Enable Apple Pay, Google Pay, and Link under Payment methods.
3. Add webhook endpoint `https://raisingnoble.com/api/webhooks/stripe` for:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.expired`, and `checkout.session.async_payment_failed`.
4. Create a restricted secret key with Checkout Sessions write/read, Coupons write, and
   Refunds write permissions.

## Resend

1. Add and verify `raisingnoble.com` in Resend.
2. Publish the supplied DKIM and SPF records.
3. Add the MX record Resend provides for bounce handling.
4. Create a sending-only API key and store it as `RESEND_API_KEY`.

## Owner-provided items

- The street address to replace `{{SELLER_ADDRESS}}` in Privacy and Terms.
- Kit ZIP files and matching `kit.json` files.
- Optional Turnstile keys.
