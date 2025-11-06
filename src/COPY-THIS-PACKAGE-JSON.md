# 📦 STEP 1: REPLACE YOUR LOCAL package.json WITH THIS FILE

## 🚨 YOUR CURRENT package.json IS OUTDATED!

The changes I made are in Figma Make, but not in your GitHub repository yet.

You need to **manually replace** your local package.json with this updated version.

---

## ✅ OPTION 1: DOWNLOAD AND REPLACE (EASIEST)

### **1. Download this file:**

I'll create a file you can download. Save it as `package.json` in your project folder:
`/Users/natekahl/Desktop/FancyTrader/package.json`

### **2. Copy this EXACT content to your local package.json:**

```json
{
  "name": "fancy-trader",
  "version": "1.0.1",
  "description": "KCU real-time LTP setup monitor and Discord alerts system",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "postinstall": "node verify-vite-version.js",
    "build": "node verify-vite-version.js && vite build",
    "build:check": "tsc && vite build",
    "build:verify": "npm run build && node verify-css-build.js",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1",
    "recharts": "^2.12.0",
    "sonner": "^2.0.3",
    "@supabase/supabase-js": "^2.39.7",
    "date-fns": "^3.3.1",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1",
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-context-menu": "^2.1.5",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-hover-card": "^1.0.7",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-menubar": "^1.0.4",
    "@radix-ui/react-navigation-menu": "^1.1.4",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-toggle": "^1.0.3",
    "@radix-ui/react-toggle-group": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "cmdk": "^0.2.1",
    "embla-carousel-react": "^8.0.0",
    "react-day-picker": "^8.10.0",
    "react-resizable-panels": "^2.0.11",
    "vaul": "^0.9.0",
    "input-otp": "^1.2.4",
    "tailwindcss-animate": "^1.0.7",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.35",
    "autoprefixer": "^10.4.17"
  },
  "devDependencies": {
    "@types/react": "^18.2.55",
    "@types/react-dom": "^18.2.19",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "@typescript-eslint/parser": "^6.21.0",
    "@vitejs/plugin-react": "4.2.1",
    "eslint": "^8.56.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "typescript": "^5.2.2",
    "vite": "5.4.11"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "overrides": {
    "vite": "5.4.11",
    "@vitejs/plugin-react": "4.2.1"
  },
  "resolutions": {
    "vite": "5.4.11",
    "@vitejs/plugin-react": "4.2.1"
  }
}
```

---

## ✅ OPTION 2: MANUAL EDIT (QUICK)

If you want to manually edit your existing package.json:

### **1. Open in VS Code:**
```bash
cd /Users/natekahl/Desktop/FancyTrader
code package.json
```

### **2. Find line 67 and change:**
```json
BEFORE: "@vitejs/plugin-react": "^4.2.1",
AFTER:  "@vitejs/plugin-react": "4.2.1",
```
(Remove the `^` caret)

### **3. Find the "overrides" section (around line 77) and change:**
```json
BEFORE:
  "overrides": {
    "vite": "5.4.11"
  },

AFTER:
  "overrides": {
    "vite": "5.4.11",
    "@vitejs/plugin-react": "4.2.1"
  },
```

### **4. Find the "resolutions" section (around line 81) and change:**
```json
BEFORE:
  "resolutions": {
    "vite": "5.4.11"
  }

AFTER:
  "resolutions": {
    "vite": "5.4.11",
    "@vitejs/plugin-react": "4.2.1"
  }
```

### **5. Save the file** (Cmd+S)

---

## 🔍 THE KEY CHANGES:

### **Change 1: Pin plugin version (Line 67)**
```json
"@vitejs/plugin-react": "4.2.1"  ← No caret! Exact version!
```

### **Change 2: Add to overrides (Lines 77-80)**
```json
"overrides": {
  "vite": "5.4.11",
  "@vitejs/plugin-react": "4.2.1"  ← Added this line
}
```

### **Change 3: Add to resolutions (Lines 81-84)**
```json
"resolutions": {
  "vite": "5.4.11",
  "@vitejs/plugin-react": "4.2.1"  ← Added this line
}
```

---

## ✅ AFTER YOU UPDATE package.json, RUN THESE COMMANDS:

```bash
cd /Users/natekahl/Desktop/FancyTrader

# Clean everything
rm -rf node_modules package-lock.json

# Fresh install with new settings
npm install

# Verify versions
npm list vite
npm list @vitejs/plugin-react

# Commit everything
git add package.json package-lock.json
git commit -m "Fix: Lock Vite 5.4.11 and plugin 4.2.1 to prevent Vite 6"
git push
```

---

## 🎯 VERIFICATION AFTER npm install:

**MUST SEE:**
```
npm list vite
└── vite@5.4.11  ✅

npm list @vitejs/plugin-react
└── @vitejs/plugin-react@4.2.1  ✅
```

**MUST NOT SEE:**
```
└── vite@6.3.5  ❌
└── @vitejs/plugin-react@5.1.0  ❌
```

---

## 📋 SIMPLE STEPS:

```
1. [ ] Replace package.json (use Option 1 or 2 above)
2. [ ] cd /Users/natekahl/Desktop/FancyTrader
3. [ ] rm -rf node_modules package-lock.json
4. [ ] npm install
5. [ ] npm list vite (shows 5.4.11)
6. [ ] npm list @vitejs/plugin-react (shows 4.2.1)
7. [ ] git add package.json package-lock.json
8. [ ] git commit -m "Fix: Lock Vite 5.4.11 and plugin 4.2.1"
9. [ ] git push
10. [ ] Wait for Vercel rebuild
11. [ ] Check console for 127+ KB CSS
```

---

🚀 **START WITH STEP 1: REPLACE YOUR package.json FILE!** 🚀
