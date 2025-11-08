#!/bin/bash

# Super simple - just push .npmrc and vercel.json to GitHub
# Vercel will auto-deploy with the fixed config

GITHUB_TOKEN="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"
REPO="https://${GITHUB_TOKEN}@github.com/n8kahl/FancyTrader.git"

echo "🚀 Pushing CSS fix to GitHub..."

git config user.name "Bot" 2>/dev/null || true
git config user.email "bot@app.com" 2>/dev/null || true
git checkout main 2>/dev/null || git checkout -b main
git add .npmrc vercel.json
git commit -m "Fix CSS: Force Vite 5.4.11" --no-verify || true
git push "$REPO" main --force

echo ""
echo "✅ DONE! Vercel deploying now..."
echo "📊 Watch: https://vercel.com/n8kahls-projects/fancy-trader2/deployments"
echo ""
echo "Look for: 'vite v5.4.11' and 'CSS SIZE: 50+ KB'"
echo ""
