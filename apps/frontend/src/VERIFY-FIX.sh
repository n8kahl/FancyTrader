#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║           VERIFYING CSS FIX CONFIGURATION                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "1️⃣  PACKAGE.JSON - VITE VERSION:"
echo "────────────────────────────────────────────────────────────"
grep -A1 '"vite"' package.json | grep -v '^--$'
echo ""

echo "2️⃣  PACKAGE.JSON - OVERRIDES:"
echo "────────────────────────────────────────────────────────────"
grep -A5 '"overrides"' package.json | grep -v '^--$'
echo ""

echo "3️⃣  .NPMRC:"
echo "────────────────────────────────────────────────────────────"
cat .npmrc
echo ""

echo "4️⃣  VERCEL.JSON - INSTALL COMMAND:"
echo "────────────────────────────────────────────────────────────"
grep '"installCommand"' vercel.json
echo ""

echo "5️⃣  VERCEL.JSON - BUILD COMMAND:"
echo "────────────────────────────────────────────────────────────"
grep '"buildCommand"' vercel.json
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "✅ EXPECTED BEHAVIOR ON VERCEL:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Step 1: installCommand runs"
echo "  → Deletes node_modules and package-lock.json"
echo "  → Installs vite@5.4.11 FIRST with --save-exact"
echo "  → Installs rest of dependencies"
echo "  → Logs final vite version"
echo ""
echo "Step 2: buildCommand runs"
echo "  → Shows vite version (should be 5.4.11)"
echo "  → Builds with npx vite@5.4.11 build"
echo "  → Shows CSS file size (should be 50+ KB)"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🎯 SUCCESS = Build log shows:"
echo "═══════════════════════════════════════════════════════════"
echo "✅ AFTER INSTALL: vite@5.4.11"
echo "✅ 🚀 BUILDING WITH: 5.4.11"
echo "✅ vite v5.4.11 building for production..."
echo "✅ 📊 CSS SIZE: build/assets/index-*.css  50+ KB"
echo ""

echo "Ready to deploy!"
echo "Run: bash DEPLOY-FIX-NOW.sh"
echo ""
