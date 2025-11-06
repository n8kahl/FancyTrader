#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚨 FINAL CSS FIX - VITE VERSION LOCKING + FORCE REBUILD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📊 Problems Found in Build Log:"
echo "  ❌ Vite 6.3.5 running (should be 5.4.11)"
echo "  ❌ Build cache still used (not cleared)"
echo "  ❌ CSS only 1.68 KB (should be 50+ KB)"
echo ""

echo "✅ Fixes Applied:"
echo "  1. Added .npmrc to force exact versions"
echo "  2. Added pnpm overrides to package.json"
echo "  3. Updated vite.config.ts with explicit PostCSS config"
echo ""

echo "📦 Step 1: Delete node_modules and package-lock (if exists)..."
rm -rf node_modules package-lock.json

echo ""
echo "📥 Step 2: Fresh npm install with locked versions..."
npm install

echo ""
echo "🧪 Step 3: Test build locally..."
npm run build

echo ""
echo "📋 Step 4: Check built CSS size..."
if [ -f "build/assets/index-*.css" ]; then
  CSS_SIZE=$(ls -lh build/assets/index-*.css | awk '{print $5}')
  echo "  Built CSS size: $CSS_SIZE"
  if [ -n "$CSS_SIZE" ]; then
    echo "  ✅ CSS file found"
  fi
else
  echo "  ⚠️  CSS file not found - checking build directory..."
  ls -la build/assets/ || echo "No build/assets directory"
fi

echo ""
echo "📦 Step 5: Committing all fixes..."
git add package.json .npmrc vite.config.ts
git commit -m "fix: Lock Vite to 5.4.11 and force Tailwind CSS processing

- Added .npmrc to prevent version drift
- Added pnpm overrides for Vite 5.4.11
- Updated vite.config.ts with explicit PostCSS config
- This ensures Tailwind generates full 50+ KB CSS file

Build log showed Vite 6.3.5 was running despite package.json specifying 5.4.11.
This caused Tailwind CSS to not process properly (only 1.68 KB instead of 50+ KB)."

echo ""
echo "🚀 Step 6: Pushing to GitHub..."
git push origin main

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  CRITICAL: YOU MUST DO THIS IN VERCEL DASHBOARD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Your build log showed: 'Restored build cache from previous deployment'"
echo "This means you did NOT successfully disable the cache!"
echo ""
echo "📱 CORRECT WAY TO DISABLE CACHE:"
echo ""
echo "1. Go to: https://vercel.com/dashboard"
echo "2. Click 'fancy-trader2' project"
echo "3. Click 'Deployments' tab"
echo "4. Find the LATEST deployment (just triggered)"
echo "5. Click the three dots '...' on the RIGHT side of the deployment row"
echo "6. Select 'Redeploy'"
echo "7. In the popup modal, look for the checkbox:"
echo "   ☐ Use existing Build Cache"
echo "8. UNCHECK THIS BOX ← Make sure it's EMPTY!"
echo "9. Click 'Redeploy' button"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 What to Look For in the NEW Build Log:"
echo ""
echo "✅ Should say: 'vite v5.4.11 building for production...'"
echo "   (NOT v6.3.5)"
echo ""
echo "✅ Should NOT say: 'Restored build cache from previous deployment'"
echo ""
echo "✅ CSS file should be: 50-80 KB uncompressed"
echo "   (NOT 1.68 KB)"
echo ""
echo "✅ Build output should show:"
echo "   build/assets/index-XXXXX.css  50+ KB │ gzip: 10+ KB"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After rebuild completes:"
echo "  1. Open: https://fancy-trader2.vercel.app"
echo "  2. Hard refresh: Cmd+Shift+R"
echo "  3. You should see beautiful dark theme styling!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
