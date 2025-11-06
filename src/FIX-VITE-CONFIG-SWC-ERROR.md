# 🚨 FIX: Missing @vitejs/plugin-react-swc Dependency

## 🔍 THE ERROR:

```
Cannot find package '@vitejs/plugin-react-swc' imported from /vercel/path0/vite.config.ts
```

## 💡 THE PROBLEM:

Your local `vite.config.ts` is trying to import `@vitejs/plugin-react-swc`, but it's not in your package.json dependencies!

**You have TWO OPTIONS:**

---

## ✅ OPTION 1: REPLACE vite.config.ts (RECOMMENDED - FASTER)

This uses the standard `@vitejs/plugin-react` (which is already in your package.json):

```bash
cd /Users/natekahl/Desktop/FancyTrader

# Replace vite.config.ts
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'build',
  },
})
EOF

# Commit and push
git add vite.config.ts
git commit -m "Fix: Use @vitejs/plugin-react instead of -swc"
git push
```

---

## ✅ OPTION 2: ADD THE SWC PLUGIN TO package.json (SLOWER)

If you want to keep using the SWC plugin, add it to dependencies:

```bash
cd /Users/natekahl/Desktop/FancyTrader

# Add to package.json (modify the devDependencies section)
# Add this line after "@vitejs/plugin-react": "4.2.1",:
#   "@vitejs/plugin-react-swc": "^3.5.0",

# Then:
git add package.json
git commit -m "Add @vitejs/plugin-react-swc dependency"
git push
```

**But this is slower and more complex. I recommend Option 1.**

---

## 🎯 WHY THIS HAPPENED:

Your package.json had this leftover from a grep search:
```
"@vitejs/plugin-react-swc": "^3.10.2",
```

But it was in the wrong place (probably in overrides or somewhere that NPM ignored), so it wasn't actually installed.

---

## 🚀 USE OPTION 1 - IT'S FASTER:

Copy and paste this entire block:

```bash
cd /Users/natekahl/Desktop/FancyTrader && cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'build',
  },
})
EOF
git add vite.config.ts && git commit -m "Fix: Use @vitejs/plugin-react" && git push
```

---

**This will fix the missing dependency error!** 🎯
