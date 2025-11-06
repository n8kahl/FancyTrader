#!/bin/bash

echo "🔧 Fixing ALL versioned imports in local repository..."
echo ""

# This script removes @version from imports in .ts and .tsx files
# Example: "@radix-ui/react-slot@1.1.2" becomes "@radix-ui/react-slot"

# Function to clean a file
clean_file() {
    local file="$1"
    
    # Check if file exists
    if [ ! -f "$file" ]; then
        return
    fi
    
    # Check if file has versioned imports
    if grep -qE 'from ["\047][^"'\'']+@[0-9]+\.[0-9]' "$file"; then
        echo "  Fixing: $file"
        
        # macOS/BSD sed (use -i '')
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' -E 's/(from ["\047][^"'\'']+)@[0-9]+\.[0-9]+\.[0-9]+(["\047])/\1\2/g' "$file"
            sed -i '' -E 's/(from ["\047][^"'\'']+)@[0-9]+\.[0-9]+(["\047])/\1\2/g' "$file"
        else
            # GNU sed (Linux)
            sed -i -E 's/(from ["\047][^"'\'']+)@[0-9]+\.[0-9]+\.[0-9]+(["\047])/\1\2/g' "$file"
            sed -i -E 's/(from ["\047][^"'\'']+)@[0-9]+\.[0-9]+(["\047])/\1\2/g' "$file"
        fi
    fi
}

# Clean all component files
echo "📂 Cleaning /src/components..."
find src/components -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
    clean_file "$file"
done

echo ""
echo "📂 Cleaning /src/hooks..."
find src/hooks -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
    clean_file "$file"
done

echo ""
echo "📂 Cleaning /src/services..."
find src/services -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
    clean_file "$file"
done

echo ""
echo "📂 Cleaning root /src files..."
for file in src/*.ts src/*.tsx; do
    clean_file "$file"
done

echo ""
echo "✅ DONE! Checking for remaining versioned imports..."
echo ""

# Verify no versioned imports remain
if grep -rE 'from ["\047][^"'\'']+@[0-9]+\.[0-9]' src/ 2>/dev/null; then
    echo ""
    echo "⚠️  WARNING: Some versioned imports still found above!"
    echo "   You may need to fix these manually."
else
    echo "✅ Perfect! No versioned imports found in src/"
fi

echo ""
echo "🚀 Ready to build! Run: npm run build"
