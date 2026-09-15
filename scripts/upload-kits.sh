#!/usr/bin/env bash
# Upload every kit ZIP to R2 and verify each one landed.
#
#   ./scripts/upload-kits.sh ~/raising-noble-kits
#
# Expects one file per kit named <id>.zip in the directory you pass. Uploads to
# kits/<id>/kit.zip, which is the key the download route reads. Re-running is
# safe: R2 overwrites by key, so a failed run can just be repeated.
#
# An optional <id>.json next to it uploads as kits/<id>/kit.json, which is what
# the catalogue sync reads to decide whether a kit is on sale. An optional
# <id>.webp uploads as the kit's cover image. Neither is required.
set -euo pipefail

SRC="${1:-}"
BUCKET="${BUCKET:-raising-noble-kits}"
REMOTE="${REMOTE:---remote}"

if [ -z "$SRC" ] || [ ! -d "$SRC" ]; then
  echo "usage: $0 <directory containing <id>.zip files>" >&2
  exit 1
fi

IDS=$(node -e "
  const kits = require('./src/data/kits.base.json');
  process.stdout.write(kits.filter((k) => k.status === 'available').map((k) => k.id).join('\n'));
")

missing=0
for id in $IDS; do
  [ -f "$SRC/$id.zip" ] || { echo "MISSING  $SRC/$id.zip"; missing=1; }
done
if [ "$missing" -ne 0 ]; then
  echo
  echo "Nothing uploaded. Name every file after its kit id and run again." >&2
  exit 1
fi

echo "Checking archives before upload…"
for id in $IDS; do
  unzip -tqq "$SRC/$id.zip" >/dev/null 2>&1 || { echo "CORRUPT  $id.zip — unzip -t failed"; exit 1; }
  # A Zip64 archive still downloads, but the per-buyer LICENCE.txt cannot be
  # appended to it, so flag it rather than silently shipping without one.
  if unzip -v "$SRC/$id.zip" 2>/dev/null | grep -q 'Zip64'; then
    echo "NOTE     $id.zip is Zip64 — it will download fine but without the licence file"
  fi
done

for id in $IDS; do
  size=$(du -h "$SRC/$id.zip" | cut -f1)
  echo "→ $id ($size)"
  npx wrangler r2 object put "$BUCKET/kits/$id/kit.zip" \
    --file "$SRC/$id.zip" --content-type application/zip $REMOTE
  # scripts/sync-catalogue.mjs decides a kit's on-sale status from kits/<id>/kit.json,
  # so a kit with no kit.json keeps whatever status kits.base.json gives it and the
  # "coming soon" safety catch never engages. Ship one when the source folder has it.
  if [ -f "$SRC/$id.json" ]; then
    echo "  + kit.json"
    npx wrangler r2 object put "$BUCKET/kits/$id/kit.json" \
      --file "$SRC/$id.json" --content-type application/json $REMOTE
  fi
  if [ -f "$SRC/$id.webp" ]; then
    echo "  + cover.webp"
    npx wrangler r2 object put "$BUCKET/kits/$id/cover.webp" \
      --file "$SRC/$id.webp" --content-type image/webp $REMOTE
  fi
done

echo
echo "Verifying…"
fail=0
for id in $IDS; do
  if npx wrangler r2 object get "$BUCKET/kits/$id/kit.zip" --pipe $REMOTE >/dev/null 2>&1; then
    echo "  ok      kits/$id/kit.zip"
  else
    echo "  FAILED  kits/$id/kit.zip"
    fail=1
  fi
done

exit "$fail"
