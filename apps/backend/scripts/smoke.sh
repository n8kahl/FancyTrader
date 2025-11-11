#!/usr/bin/env bash
set -euo pipefail
API="${API_BASE:-https://fancy-trader.up.railway.app}"
ORIGIN="${ORIGIN_ALLOWED:-https://fancy-trader-front.up.railway.app}"

echo "1) Preflight…"
code=$(curl -sS -o /dev/null -w "%{http_code}" -I -X OPTIONS \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  "$API/api/market/status")
test "$code" = "204" && echo "✓ preflight 204" || (echo "Preflight failed: $code" && exit 1)

echo "2) Status…"
resp=$(curl -sS -H "Origin: $ORIGIN" "$API/api/market/status")
echo "$resp" | jq -e '.source=="massive" and .raw!=null' >/dev/null \
  && echo "✓ source: massive" \
  || (echo "Bad status payload"; echo "$resp"; exit 1)

echo "3) Ready…"
code=$(curl -sS -o /dev/null -w "%{http_code}" "$API/readyz")
test "$code" = "200" && echo "✓ readyz 200" || (echo "readyz failed: $code" && exit 1)

echo "All smoke checks passed."
