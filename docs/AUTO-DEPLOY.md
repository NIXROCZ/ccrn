# Keeping the live site in step with the code

Two secrets, added once. After that every change deploys itself, and nobody has
to remember to do anything.

---

## The problem this solves

The site and the code drift apart silently. On 15 September the live Worker was
serving code from 8 September — thirteen commits behind — and nothing anywhere
said so. The site looked fine, because an out-of-date site always does.

With this set up, a change is live a minute after it is pushed, and it cannot
be pushed if the tests fail.

---

## Setup — about two minutes

### 1. Make a Cloudflare API token

[dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
→ **Create Token** → use the **Edit Cloudflare Workers** template.

Under *Account Resources* pick the Raising Noble account. Create it, then copy
the token — **Cloudflare shows it once and never again.**

### 2. Find your account id

Cloudflare dashboard → **Workers & Pages**. The Account ID is in the right-hand
sidebar. It is 32 hex characters.

### 3. Put both into GitHub

`github.com/NIXROCZ/ccrn` → **Settings** → **Secrets and variables** →
**Actions** → **New repository secret**. Add two:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the token from step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | the id from step 2 |

Spelling matters — the workflow looks for those exact names.

### 4. That is the whole setup

The next push deploys. To see it work without changing anything real, push any
commit and watch the **Actions** tab.

---

## What happens on every push

```
push  →  lint  →  tests  →  build  →  generated files unchanged?
                                              ↓  all green
                             migrations applied  →  deploy  →  live
```

**Nothing deploys unless every check passes.** The deploy job `needs: check`, so
a commit that breaks a test cannot reach a customer. That is the entire point of
having it gated rather than deploying straight from a push.

Other properties worth knowing:

- **Only the deploying branch.** Pull requests are checked but never deployed.
- **Deploys never race.** Two pushes close together queue rather than overlap,
  so the newest commit is always what ends up live.
- **Migrations run first**, so new code never meets an older schema. They are
  idempotent — only migrations the database has not seen are applied.
- **No secrets, no failure.** Before they are set the deploy step skips with a
  note rather than failing. A red tick on every push teaches everyone to ignore
  red ticks.

---

## Which site gets updated

The **preview** Worker — `raising-noble-preview.<subdomain>.workers.dev`, the
URL currently being shared.

Production (`raising-noble`, eventually `raisingnoble.com`) is deliberately not
deployed yet. Until the custom domain is attached it would be a second copy
nobody visits, sending emails pointing at a domain that does not resolve.

**When the domain is ready:** in `.github/workflows/ci.yml`, change `--env
preview` to `--env=""` on the migrate and deploy steps — or add a second pair so
both stay current. Cloudflare keeps secrets per environment, so set the
production secrets before switching:

```bash
npx wrangler secret put STRIPE_SECRET_KEY --env=""
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env=""
npx wrangler secret put RESEND_API_KEY --env=""
npx wrangler secret put SITE_PEPPER --env=""        # the SAME value as preview
npx wrangler secret put SYNC_TOKEN --env=""
```

`SITE_PEPPER` must match between environments or gift cards issued on one will
not be recognised by the other.

---

## Checking it actually worked

The Actions tab shows a green tick and a summary naming the commit deployed.

To check the site rather than the pipeline:

```bash
SYNC_TOKEN=... npm run health -- https://raising-noble-preview.<subdomain>.workers.dev
```

That reports whether every secret is set, the database carries its migrations,
KV works, and every sellable kit has a file in R2. Green pipeline and green
health check together mean the site is genuinely current and wired up.

---

## When a deploy fails

Actions tab → the failed run → the red step. The usual causes:

| Message | Cause |
|---|---|
| `Authentication error [code: 10000]` | Token wrong, expired, or lacking Workers edit permission |
| `Could not route to /accounts/…` | `CLOUDFLARE_ACCOUNT_ID` is wrong |
| `binding … not found` | An id in `wrangler.jsonc` does not exist in this account — see `scripts/set-bindings.mjs` |
| `D1_ERROR … no such table` | Migrations did not apply; check that step's log |
| Deploy skipped, no error | Secrets are not set, or are named differently |

A failed deploy leaves the previous version serving. The site does not go down;
it just does not move forward.

---

## The alternative, if you would rather not use GitHub

Cloudflare can watch the repository itself: **Workers & Pages → your Worker →
Settings → Build → Connect to Git**, with build command `npm run build` and
deploy command `npx wrangler deploy --env preview`.

It works. The reason this repository uses GitHub Actions instead is that the
tests already run there, so deployment can be gated on them — and the build logs
sit next to the code, where anyone helping with the repository can read them.

Using both would mean two deploys per push, racing each other. Pick one.
