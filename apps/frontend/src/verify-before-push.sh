#!/bin/bash

echo "=========================================="
echo "🔍 PRE-PUSH VERIFICATION"
echo "=========================================="
echo ""

echo "1️⃣ Package.json checks:"
echo "   Name: $(grep '"name"' package.json | head -1)"
echo "   Vite: $(grep '"vite"' package.json | grep -v plugin)"
echo ""

echo "2️⃣ Files that will be pushed:"
git diff --stat HEAD
echo ""

echo "3️⃣ Package.json vite version:"
grep -A 2 '"devDependencies"' package.json | grep vite
echo ""

echo "4️⃣ Vercel.json build command:"
grep buildCommand vercel.json
echo ""

echo "5️⃣ Vite config plugin:"
grep '@vitejs/plugin-react' vite.config.ts
echo ""

echo "=========================================="
echo "✅ Verification complete!"
echo "=========================================="
echo ""
echo "If everything looks correct, run:"
echo "  git add package.json vercel.json"
echo "  git commit -m 'Add comprehensive build logging'"
echo "  git push origin main"
echo ""
