#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🔍 CHECKING WHAT'S ACTUALLY ON GITHUB                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

echo "1️⃣ GitHub main branch package.json:"
echo "───────────────────────────────────────"
curl -s https://raw.githubusercontent.com/n8kahl/FancyTrader/main/package.json | grep -E '"name"|"vite"' | head -5
echo ""

echo "2️⃣ Commit that Vercel deployed (ab8c54e):"
echo "───────────────────────────────────────"
curl -s https://raw.githubusercontent.com/n8kahl/FancyTrader/ab8c54e/package.json 2>/dev/null | grep -E '"name"|"vite"' | head -5 || echo "Commit not found or protected"
echo ""

echo "3️⃣ Your local package.json:"
echo "───────────────────────────────────────"
grep -E '"name"|"vite"' package.json | head -5
echo ""

echo "4️⃣ Latest local commits:"
echo "───────────────────────────────────────"
git log --oneline -5 2>/dev/null || echo "Not a git repository or git not available"
echo ""

echo "5️⃣ Git remote status:"
echo "───────────────────────────────────────"
git remote -v 2>/dev/null || echo "Not a git repository"
echo ""

echo "6️⃣ Current branch:"
echo "───────────────────────────────────────"
git branch 2>/dev/null || echo "Not a git repository"
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  📊 ANALYSIS                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Compare the values above:"
echo ""
echo "If GitHub shows: \"name\": \"KCU\" or \"vite\": \"6.3.5\""
echo "   → GitHub has OLD files!"
echo "   → Use GitHub web editor to fix"
echo ""
echo "If they all match (fancy-trader, 5.4.11):"
echo "   → Check Vercel project settings"
echo "   → May have branch or build overrides"
echo ""
