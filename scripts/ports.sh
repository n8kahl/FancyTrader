#!/usr/bin/env bash
set -euo pipefail
echo "PORTS:"
lsof -i :3001 || true
lsof -i :3002 || true
docker ps --format 'table {{.ID}}\t{{.Names}}\t{{.Ports}}' | (grep -i backend || true)
