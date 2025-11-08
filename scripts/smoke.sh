#!/usr/bin/env bash
set -euo pipefail
PORT="${1:-3002}"
curl -sf http://localhost:$PORT/healthz && echo
curl -sf http://localhost:$PORT/readyz && echo
curl -sf http://localhost:$PORT/api/market/status && echo
