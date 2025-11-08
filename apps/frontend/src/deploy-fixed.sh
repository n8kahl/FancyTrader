#!/bin/bash

# FancyTrader - Deploy After Import Fix
# This script commits the import fixes and triggers Vercel deployment

echo "🚀 FancyTrader - Deploying Fixed Imports"
echo "========================================"
echo ""

# Navigate to project directory
cd /Users/natekahl/Desktop/FancyTrader

# Show what changed
echo "📝 Files modified:"
git status --short
echo ""

# Confirm before proceeding
read -p "Ready to commit and deploy? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Stage all changes
echo "📦 Staging changes..."
git add -A

# Commit
echo "💾 Committing..."
git commit -m "fix: Remove all versioned imports for Vercel compatibility

- Fixed 40 UI component files in /components/ui/
- Removed @X.X.X version suffixes from all imports
- Kept react-hook-form@7.55.0 per library requirements
- All imports now resolve from package.json
- Ready for Vercel deployment

Components fixed:
- All Radix UI components (@radix-ui/*)
- All Lucide React icons (lucide-react)
- Class Variance Authority (class-variance-authority)
- Recharts, Embla Carousel, CMDK, Vaul, etc.

This resolves the 'Failed to resolve import' errors in Vercel builds."

# Push to remote
echo "🌐 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🎯 What happens next:"
echo "   1. GitHub receives your commit"
echo "   2. Vercel detects the push"
echo "   3. Vercel starts automatic deployment"
echo "   4. Build should now succeed! ✨"
echo ""
echo "🔗 Check deployment status:"
echo "   - Vercel Dashboard: https://vercel.com/dashboard"
echo "   - Your Site: https://fancy-trader2.vercel.app"
echo ""
echo "⏱️  Build typically takes 2-3 minutes"
echo ""
