# Changing the pictures

No code, no build tools. Put a file in a folder with the right name, push, done.

---

## The thing worth knowing first

**Nineteen of the twenty kits are showing a drawn placeholder, not your Canva
artwork.**

The site decides a kit's cover in this order:

1. A `cover.webp` uploaded to R2 alongside the kit — used if present.
2. `public/covers/<kit-id>.jpg` — used if the kit is marked `realCover`.
3. Otherwise a **generated** cover: the sage circle with a little line-drawn
   motif, built from the kit's title in `src/lib/covers.ts`.

Right now only `seed-oils` has a real cover file. Every other kit is on option
3. They look deliberate — they are not placeholders in the ugly sense — but
they are not the artwork in your Canva mockups.

---

## Replacing a kit cover

### 1. Get the picture out of Canva

Open the design → **Share** → **Download** → **JPG** → Download.

Square is what the grid wants (the tile is 1:1). If your artwork is not square,
crop it square in Canva first — otherwise the site crops it for you, from the
centre, and may cut the title.

About **1000 × 1000** is plenty. Bigger only makes the page slower.

### 2. Name it after the kit id

**The filename is the product id.** Not the title, not what Canva called it.

| Kit | File must be named |
|---|---|
| Seed Oils Kit | `seed-oils.jpg` |
| Refined Sugar Kit | `refined-sugar.jpg` |
| Artificial Colours Kit | `artificial-colours.jpg` |
| Artificial Flavours Kit | `artificial-flavours.jpg` |
| Preservatives Kit | `preservatives.jpg` |
| EMFs Kit | `emfs.jpg` |
| Aluminium Kit | `aluminium.jpg` |
| Forever Chemicals Kit | `forever-chemicals.jpg` |
| Microplastics Kit | `microplastics.jpg` |
| Artificial Fragrances Kit | `artificial-fragrances.jpg` |
| Getting Lost & Staying Safe Kit | `getting-lost.jpg` |
| Safe vs Unsafe Secrets Kit | `safe-secrets.jpg` |
| Safe vs Unsafe Touch Kit | `safe-touch.jpg` |
| Personal Space & Body Consent Kit | `personal-space.jpg` |
| Trusted Adults & Asking For Help Kit | `trusted-adults.jpg` |

The full list is always in `src/data/kits.base.json` — the `id` field.

### 3. Put it in `public/covers/`

Drop the file in. Replacing an existing one is just overwriting it.

### 4. Tell the site to use it

Open `src/data/kits.base.json`, find the kit, and make sure it has:

```json
"realCover": true,
```

`seed-oils` already has it. Add the line to any kit you have given a real
cover. Leave it off, and the generated cover is used no matter what file you
put in the folder — this is deliberate, so a half-finished image cannot appear
on the shop by accident.

### 5. Push

```bash
git add public/covers src/data/kits.base.json
git commit -m "Real covers for the food kits"
git push
```

Once Workers Builds is connected (`docs/GO-LIVE.md` §8.1), pushing is the
deploy. Otherwise run `npm run build && npx wrangler deploy`.

**Check:** open `/shop`. The tile should be your artwork. If it is still the
drawn circle, `realCover` is missing or the filename does not match the id.

---

## Changing a cover without touching the repo

If you would rather not push code, upload `cover.webp` into R2 beside the kit:

```
kits/seed-oils/cover.webp
```

Or put a `<kit-id>.webp` next to the ZIPs before running
`./scripts/upload-kits.sh` — it uploads it for you. The next build picks it up
and it beats the repo file. Useful for changing a picture after launch without
a developer.

---

## The other pictures

Everything else lives in `public/images/` and is referenced by name.

| What | File |
|---|---|
| Home hero video poster | `hero-poster.webp` |
| Home hero video | `video/hero.mp4` |
| Shop page banner | `shop-hero.webp` |
| About page banner | `about-hero.webp` |
| Founder photo (About) | `about-authors.webp` |
| Gift card, front | `gift-card-front.png` |
| Gift card, reverse | `gift-card-reverse.png` |
| Bundle page banner | `bundle-hero.webp` |

To swap one, save your new picture **with exactly the same filename** and
overwrite it. Nothing else to change.

### On file formats

`.webp` files are roughly a third the size of a `.jpg` at the same quality, and
the site is full of large photographs. Canva exports JPG and PNG, not WebP.
Convert with [squoosh.app](https://squoosh.app) — drag the file in, pick WebP
on the right, download. Worth it for photographs; not worth it for the small
flat-colour graphics.

If you overwrite `about-hero.webp` with a JPG that you have merely *renamed*
to `.webp`, browsers still display it. It just will not be any smaller. Convert
properly rather than renaming.

---

## Two things that will trip you up

**Cached pictures.** After deploying, your browser may hold the old image for
up to 30 days — images are cached hard on purpose, because it makes the site
fast. To check your change really shipped, open the page in a private window,
or hard-refresh (Ctrl/Cmd + Shift + R).

**Alt text.** Every photograph has a written description in the page for
screen readers and for when an image fails to load. If you change a picture to
something showing something different, change its description too — they sit
next to each other in the page file, as `alt="..."`. A wrong description is
worse than none.
