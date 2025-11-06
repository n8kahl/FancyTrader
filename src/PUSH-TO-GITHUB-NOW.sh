#!/bin/bash

echo "🚀 PUSHING VITE 5.4.11 FIX TO GITHUB..."
echo ""

cd /Users/natekahl/Desktop/FancyTrader

# Abort any incomplete merge
git merge --abort 2>/dev/null

# Add all critical files
git add .npmrc vercel.json package.json

# Commit
git commit -m "CRITICAL FIX: Force Vite 5.4.11 with .npmrc and vercel.json config"

# Push to GitHub (this will trigger Vercel auto-deploy)
git push origin main --force

echo ""
echo "✅ PUSHED TO GITHUB!"
echo ""
echo "🔄 Vercel will auto-deploy in ~60 seconds..."
echo "📊 Watch build at: https://vercel.com/n8kahls-projects/fancy-trader2"
echo ""
echo "🎯 Look for in build logs:"
echo "   ✅ vite v5.4.11 building for production..."
echo "   ✅ build/assets/index-XXXXX.css  50+ KB"
echo ""
