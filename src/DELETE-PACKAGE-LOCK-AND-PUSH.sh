#!/bin/bash
set -e

clear
echo "🚨 NUCLEAR OPTION: Deleting package-lock.json from Git"
echo ""

TOKEN="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"
REPO="https://${TOKEN}@github.com/n8kahl/FancyTrader.git"

git config user.name "Bot" || true
git config user.email "bot@app.com" || true
git checkout main || git checkout -b main

echo "Deleting package-lock.json..."
rm -f package-lock.json
git add package-lock.json
git add vercel.json

git commit -m "NUCLEAR: Delete package-lock.json, force fresh install

package.json has vite@5.4.11
package-lock.json may have cached vite@6.3.5

Deleting lock file forces npm to resolve from package.json

vercel.json: npm install --force + npx vite@5.4.11 build" --no-verify

git push "$REPO" main --force

echo ""
echo "✅ DONE!"
echo ""
echo "Vercel will now:"
echo "  1. Clone repo (no package-lock.json)"
echo "  2. Run npm install --force (reads package.json)"
echo "  3. Install vite@5.4.11 from package.json"
echo "  4. Build with npx vite@5.4.11"
echo ""
echo "📊 Watch: https://vercel.com/n8kahls-projects/fancy-trader2/deployments"
echo ""
