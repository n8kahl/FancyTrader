#!/bin/bash

echo "🧪 Testing Fancy Trader Build..."
echo ""

# Step 1: Clean
echo "📦 Step 1: Cleaning old builds..."
rm -rf node_modules dist .vite
echo "✅ Clean complete"
echo ""

# Step 2: Install
echo "📥 Step 2: Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ npm install failed!"
    exit 1
fi
echo "✅ Install complete"
echo ""

# Step 3: Build
echo "🔨 Step 3: Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Build complete"
echo ""

# Step 4: Verify CSS
echo "🎨 Step 4: Verifying CSS output..."
CSS_FILES=$(ls -1 dist/assets/*.css 2>/dev/null | wc -l)
if [ $CSS_FILES -eq 0 ]; then
    echo "❌ No CSS files found in dist/assets/"
    echo "This means Tailwind CSS was not built properly!"
    exit 1
fi

CSS_SIZE=$(du -h dist/assets/*.css 2>/dev/null | head -1 | awk '{print $1}')
echo "✅ Found CSS file(s): $CSS_FILES file(s)"
echo "📊 CSS size: $CSS_SIZE"

if [ "$CSS_SIZE" = "0B" ] || [ "$CSS_SIZE" = "0" ]; then
    echo "❌ CSS file is empty!"
    exit 1
fi

echo ""
echo "✅ ALL CHECKS PASSED!"
echo ""
echo "📋 Build Summary:"
echo "   • Dependencies: Installed"
echo "   • Build: Success"
echo "   • CSS: Generated ($CSS_SIZE)"
echo ""
echo "🚀 Ready to deploy!"
echo ""
echo "Next steps:"
echo "1. Test locally: npm run preview"
echo "2. Deploy: git add . && git commit -m 'Fix build' && git push"
