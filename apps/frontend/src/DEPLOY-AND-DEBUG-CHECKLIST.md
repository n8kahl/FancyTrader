# ✅ Deploy & Debug Checklist

## Pre-Deploy (Do This First)

- [ ] Run `npm install` to install `tailwindcss-animate`
- [ ] Run `npm run build:verify` to verify build works
- [ ] Run `npm run preview` and check `http://localhost:4173`
- [ ] Confirm preview shows proper styling (cards, colors, shadows)

---

## Deploy

```bash
git add .
git commit -m "Add CSS debugging + fix tailwindcss-animate"
git push
```

- [ ] Push completed
- [ ] Wait 2 minutes for Vercel deployment
- [ ] Check Vercel dashboard shows "Ready" status

---

## Post-Deploy Checks

### 1. Visual Check

Open: `https://fancy-trader2.vercel.app`

- [ ] Page loads without errors
- [ ] **Diagnostic Panel** visible in bottom-right corner
- [ ] Cards have styling (rounded corners, shadows, borders)
- [ ] Strategy badges are colored (blue/green/purple)
- [ ] Buttons look styled with hover effects
- [ ] Background is light gray (not white)

### 2. Diagnostic Panel Check

Click the diagnostic panel in bottom-right:

- [ ] "Stylesheets" count is **> 0** (should be 1-2)
- [ ] "Tailwind" shows **"Loaded"** (not "NOT LOADED")
- [ ] Backend URL shows correct Railway URL
- [ ] No red error badges

If issues found:

- [ ] Click **Copy** button
- [ ] Save diagnostic JSON for debugging

### 3. Console Check

Press **F12** → **Console** tab

Look for these logs:

- [ ] `🚀 Fancy Trader Starting...`
- [ ] `📦 Environment: production`
- [ ] `🌐 Backend URL: https://fancy-trader.up.railway.app`
- [ ] `📄 CSS Import: globals.css loaded`
- [ ] `✅ React app rendered`
- [ ] No red errors

### 4. Network Tab Check

Press **F12** → **Network** tab → Refresh page

Find CSS file (should be named like `index-abc123.css`):

- [ ] Status: **200** (green, not red)
- [ ] Size: **~100-200 KB** (not 0 B)
- [ ] Type: **css**
- [ ] From: **/assets/**

### 5. Backend Connection Check

Look at top-right of page:

- [ ] Shows **"Backend Connected"** in green
- [ ] Shows **"Live"** with WiFi icon
- [ ] Market status shows real time (not stuck)
- [ ] Trades are loading/updating

---

## If Something's Wrong

### ❌ CSS Still Not Loading

**Symptoms:**

- Plain HTML text
- No colors or spacing
- Diagnostic shows "Stylesheets: 0"

**Fix:**

1. Check Vercel build logs for errors
2. Settings → Clear Build Cache
3. Redeploy

### ❌ Tailwind Shows "NOT LOADED"

**Symptoms:**

- Some styling but broken
- Diagnostic shows "Tailwind: NOT LOADED"

**Fix:**

```bash
npm install tailwindcss-animate
npm run build:verify
git push
```

### ❌ Backend Not Connecting

**Symptoms:**

- "Backend Disconnected" in red
- No live data
- Mock trades showing

**Fix:**

1. Verify Vercel environment variables set:
   - `VITE_BACKEND_URL`
   - `VITE_BACKEND_WS_URL`
2. Redeploy after adding env vars

### ❌ Build Failed on Vercel

**Symptoms:**

- Deployment shows error
- Build logs show errors

**Fix:**

1. Check build logs for specific error
2. Common issues:
   - Missing dependency
   - TypeScript error
   - PostCSS config issue
3. Fix locally first, then redeploy

---

## Success Criteria

✅ **You're done when:**

1. **Visual:**

   - Cards look like cards (not plain text)
   - Colors and spacing are correct
   - Professional design visible

2. **Diagnostic Panel:**

   - Green badge (or yellow but expandable)
   - Stylesheets: 1+
   - Tailwind: Loaded

3. **Console:**

   - Startup logs present
   - No red errors
   - Backend connection logs

4. **Network:**

   - CSS files loading (200 status)
   - ~100-200 KB size
   - No 404 errors

5. **Backend:**
   - "Backend Connected" in green
   - Live market data
   - Real-time updates

---

## Share If Still Broken

If you've checked everything and it's still broken:

**Collect these:**

1. [ ] Diagnostic panel JSON (click Copy)
2. [ ] Console logs (F12 → Console → Copy all)
3. [ ] Screenshot of Network tab
4. [ ] Screenshot of the broken page
5. [ ] Vercel build logs (from dashboard)

**Then share all 5 items** for advanced debugging!

---

## Test Page

If you want to isolate the issue:

Visit: `https://fancy-trader2.vercel.app/test-css.html`

This is a static HTML page with inline CSS.

- **If this works:** Browser is fine, issue is Tailwind
- **If this fails:** Browser or deployment issue

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Verify build works
npm run build:verify

# Test locally
npm run preview

# Deploy
git add .
git commit -m "Fix CSS"
git push
```

---

## Estimated Timeline

- Deploy: **~2 minutes**
- Visual check: **30 seconds**
- Diagnostic check: **1 minute**
- Console/Network check: **2 minutes**

**Total: ~5 minutes** to verify deployment

---

Good luck! 🚀
