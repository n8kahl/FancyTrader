#!/bin/bash

# Script to fix all versioned imports in the FancyTrader project
# This removes @X.X.X version suffixes from all import statements

echo "🚀 Starting comprehensive import fix..."
echo ""

cd /Users/natekahl/Desktop/FancyTrader

# Counter for tracking changes
total_files=0
total_changes=0

# Function to fix imports in a file
fix_imports() {
    local file=$1
    
    # Check if file exists and is a .tsx or .ts file
    if [[ ! -f "$file" ]]; then
        return
    fi
    
    # Count changes before
    changes_before=$(grep -c '@[0-9]' "$file" 2>/dev/null || echo "0")
    
    if [[ $changes_before -eq 0 ]]; then
        return
    fi
    
    echo "📝 Fixing: $file ($changes_before versioned imports)"
    
    # Fix all versioned imports using sed
    # Pattern: from "package@X.X.X" -> from "package"
    sed -i '' 's/@[0-9]\+\.[0-9]\+\.[0-9]\+"/"/g' "$file"
    
    # Count changes after
    changes_after=$(grep -c '@[0-9]' "$file" 2>/dev/null || echo "0")
    
    if [[ $changes_after -eq 0 ]]; then
        echo "   ✅ Fixed all versioned imports"
        total_files=$((total_files + 1))
        total_changes=$((total_changes + changes_before))
    else
        echo "   ⚠️  Still has $changes_after versioned imports (may need manual fix)"
    fi
    
    echo ""
}

# Fix all TypeScript files
echo "🔍 Scanning for versioned imports..."
echo ""

# Fix components
for file in components/**/*.tsx components/**/*.ts; do
    fix_imports "$file"
done

# Fix UI components specifically
for file in components/ui/*.tsx components/ui/*.ts; do
    fix_imports "$file"
done

# Fix main app files
fix_imports "App.tsx"
fix_imports "main.tsx"

# Fix hooks
for file in hooks/*.ts hooks/*.tsx; do
    fix_imports "$file"
done

# Fix services
for file in services/*.ts services/*.tsx; do
    fix_imports "$file"
done

# Fix utils
for file in utils/*.ts utils/*.tsx; do
    fix_imports "$file"
done

# Fix types
for file in types/*.ts types/*.tsx; do
    fix_imports "$file"
done

# Fix config
for file in config/*.ts config/*.tsx; do
    fix_imports "$file"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ IMPORT FIX COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "   - Files fixed: $total_files"
echo "   - Total imports fixed: $total_changes"
echo ""
echo "🎯 Next steps:"
echo "   1. git add -A"
echo "   2. git commit -m \"Fix: Remove all versioned imports for Vercel compatibility\""
echo "   3. git push"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
