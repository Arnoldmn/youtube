#!/usr/bin/env bash
# Builds the site and creates the two deliverable zips in ../downloads:
#   instant-gold-refinery-local.zip   → full source, run with `npm install && npm run dev`
#   instant-gold-refinery-cpanel.zip  → static site, extract into cPanel public_html
set -euo pipefail
cd "$(dirname "$0")/.."
OUT_DIR="../downloads"
mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/instant-gold-refinery-{local,cpanel}.zip

npm run build

(cd out && zip -qr "../$OUT_DIR/instant-gold-refinery-cpanel.zip" . -x "*.DS_Store")
zip -qr "$OUT_DIR/instant-gold-refinery-local.zip" . \
  -x "node_modules/*" ".next/*" "out/*" "*.tsbuildinfo" "next-env.d.ts" "*.DS_Store"

ls -lh "$OUT_DIR"
