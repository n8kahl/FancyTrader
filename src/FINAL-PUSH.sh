#!/bin/bash
set -e

clear
echo "🚀 PUSHING CSS FIX TO GITHUB..."
echo ""

TOKEN="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"
REPO="https://${TOKEN}@github.com/n8kahl/FancyTrader.git"

git config user.name "Bot" || true
git config user.email "bot@app.com" || true
git checkout main || git checkout -b main

echo "Files to push:"
echo "  - vercel.json (simplified install command)"
echo ""

git add vercel.json
git commit -m "Fix CSS: Simplified Vite 5.4.11 install" --no-verify || echo "No changes"
git push "$REPO" main --force

echo ""
echo "✅ PUSHED!"
echo ""
echo "📊 Watch: https://vercel.com/n8kahls-projects/fancy-trader2/deployments"
echo ""
echo "Look for in build log:"
echo "  npm install --force"
echo "  npm list vite"
echo "  vite@5.4.11"
echo "  npx vite@5.4.11 build"
echo "  CSS 50+ KB"
echo ""
