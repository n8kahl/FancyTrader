#!/bin/bash

# Verification Script - Check All Imports Are Fixed
# Run this before deploying to ensure all versioned imports are removed

echo "🔍 FancyTrader Import Verification"
echo "===================================="
echo ""

cd /Users/natekahl/Desktop/FancyTrader

# Count versioned imports in components (excluding protected files)
echo "📊 Scanning for versioned imports in components..."
echo ""

versioned_count=$(grep -r "@[0-9]\+\.[0-9]\+\.[0-9]\+\"" components/ --include="*.tsx" 2>/dev/null | grep -v "react-hook-form@7.55.0" | wc -l | tr -d ' ')

if [ "$versioned_count" -eq "0" ]; then
    echo "✅ PASS: No problematic versioned imports in /components/"
else
    echo "❌ FAIL: Found $versioned_count versioned imports in /components/"
    echo ""
    echo "Files with versioned imports:"
    grep -r "@[0-9]\+\.[0-9]\+\.[0-9]\+\"" components/ --include="*.tsx" 2>/dev/null | grep -v "react-hook-form@7.55.0"
    echo ""
    exit 1
fi

# Check UI components specifically
ui_versioned_count=$(grep -r "@[0-9]\+\.[0-9]\+\.[0-9]\+\"" components/ui/ --include="*.tsx" 2>/dev/null | grep -v "react-hook-form@7.55.0" | wc -l | tr -d ' ')

if [ "$ui_versioned_count" -eq "0" ]; then
    echo "✅ PASS: No problematic versioned imports in /components/ui/"
else
    echo "❌ FAIL: Found $ui_versioned_count versioned imports in /components/ui/"
    exit 1
fi

# Check App.tsx
app_versioned_count=$(grep "@[0-9]\+\.[0-9]\+\.[0-9]\+\"" App.tsx 2>/dev/null | wc -l | tr -d ' ')

if [ "$app_versioned_count" -eq "0" ]; then
    echo "✅ PASS: No versioned imports in App.tsx"
else
    echo "❌ FAIL: Found $app_versioned_count versioned imports in App.tsx"
    exit 1
fi

# Check for lucide-react specifically
lucide_versioned=$(grep -r "lucide-react@" components/ --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')

if [ "$lucide_versioned" -eq "0" ]; then
    echo "✅ PASS: All lucide-react imports are clean"
else
    echo "❌ FAIL: Found $lucide_versioned versioned lucide-react imports"
    exit 1
fi

# Check for @radix-ui specifically
radix_versioned=$(grep -r "@radix-ui/[^\"]*@[0-9]" components/ --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')

if [ "$radix_versioned" -eq "0" ]; then
    echo "✅ PASS: All @radix-ui imports are clean"
else
    echo "❌ FAIL: Found $radix_versioned versioned @radix-ui imports"
    exit 1
fi

# Check for class-variance-authority specifically
cva_versioned=$(grep -r "class-variance-authority@" components/ --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')

if [ "$cva_versioned" -eq "0" ]; then
    echo "✅ PASS: All class-variance-authority imports are clean"
else
    echo "❌ FAIL: Found $cva_versioned versioned class-variance-authority imports"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL CHECKS PASSED!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 Summary:"
echo "   - 40 UI components: Clean ✅"
echo "   - Main components: Clean ✅"
echo "   - App.tsx: Clean ✅"
echo "   - lucide-react: Clean ✅"
echo "   - @radix-ui: Clean ✅"
echo "   - class-variance-authority: Clean ✅"
echo ""
echo "🚀 Ready for deployment!"
echo ""
echo "Next steps:"
echo "   1. Run: chmod +x deploy-fixed.sh"
echo "   2. Run: ./deploy-fixed.sh"
echo ""
