#!/usr/bin/env bash
# Builds dist/iphix-cpanel.zip: the committed app (no tests or dev tools), plus a production .env
# with the store's settings and freshly generated secrets. Usage: npm run build:cpanel
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$PWD/dist"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git archive --format=tar --prefix=iphix/ HEAD . ':!test' ':!tools' | tar -x -C "$WORK"

rand() { node -e "console.log(require('crypto').randomBytes($1).toString('base64url'))"; }
sed \
  -e "s#^BASE_URL=.*#BASE_URL=https://YOUR-DOMAIN.com#" \
  -e "s#^STORE_ADDRESS=.*#STORE_ADDRESS=Nairobi, Kenya#" \
  -e "s#^SESSION_SECRET=.*#SESSION_SECRET=$(rand 48)#" \
  -e "s#^ADMIN_PASSWORD=.*#ADMIN_PASSWORD=Iphix-$(rand 9)#" \
  -e "s#^PORT=.*#PORT=3000#" \
  .env.example > "$WORK/iphix/.env"
chmod 600 "$WORK/iphix/.env"

mkdir -p "$OUT"
rm -f "$OUT/iphix-cpanel.zip"
(cd "$WORK" && zip -qr "$OUT/iphix-cpanel.zip" iphix)
echo "Built $OUT/iphix-cpanel.zip"
