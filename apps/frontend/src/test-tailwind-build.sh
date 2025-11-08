#!/bin/bash

echo "🧪 Testing Tailwind Build Configuration"
echo "========================================"
echo ""

# Check config files exist
echo "📁 Checking config files..."
if [ -f "tailwind.config.cjs" ]; then
  echo "  ✅ tailwind.config.cjs exists"
else
  echo "  ❌ tailwind.config.cjs missing!"
  exit 1
fi

if [ -f "postcss.config.cjs" ]; then
  echo "  ✅ postcss.config.cjs exists"
else
  echo "  ❌ postcss.config.cjs missing!"
  exit 1
fi

if [ -f "styles/globals.css" ]; then
  echo "  ✅ styles/globals.css exists"
else
  echo "  ❌ styles/globals.css missing!"
  exit 1
fi

echo ""
echo "🔍 Checking globals.css content..."
if grep -q "@tailwind" "styles/globals.css"; then
  echo "  ✅ @tailwind directives found"
else
  echo "  ❌ @tailwind directives missing!"
  exit 1
fi

echo ""
echo "🏗️ Running build..."
npm run build

echo ""
echo "📊 Checking build output..."
if [ -d "build" ] || [ -d "dist" ]; then
  # Find CSS file
  CSS_FILE=$(find build dist -name "*.css" 2>/dev/null | grep -v ".map" | head -1)
  
  if [ -n "$CSS_FILE" ]; then
    SIZE=$(wc -c < "$CSS_FILE" | tr -d ' ')
    SIZE_KB=$((SIZE / 1024))
    
    echo "  📄 CSS file: $(basename $CSS_FILE)"
    echo "  📏 Size: ${SIZE_KB} KB"
    
    # Check if CSS was compiled (shouldn't contain @tailwind)
    if grep -q "@tailwind" "$CSS_FILE"; then
      echo "  ❌ ERROR: CSS contains raw @tailwind directives!"
      echo "     Tailwind did NOT compile!"
      exit 1
    else
      echo "  ✅ CSS was compiled (no @tailwind directives)"
    fi
    
    # Check size
    if [ $SIZE_KB -lt 10 ]; then
      echo "  ⚠️  WARNING: CSS file is very small (${SIZE_KB} KB)"
      echo "     Expected ~125 KB for full Tailwind build"
      exit 1
    else
      echo "  ✅ CSS file size looks good"
    fi
    
    # Show first 500 chars
    echo ""
    echo "  📝 First 200 chars of CSS:"
    head -c 200 "$CSS_FILE"
    echo ""
    echo "  ..."
    
  else
    echo "  ❌ No CSS file found in build output!"
    exit 1
  fi
else
  echo "  ❌ Build directory not found!"
  exit 1
fi

echo ""
echo "✅ BUILD TEST PASSED!"
echo "   Tailwind is compiling correctly."
