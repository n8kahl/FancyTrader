# ✅ Deployment Checklist

## Pre-Deployment
- [x] Dependencies installed (`tailwindcss-animate` added)
- [x] Environment helpers created (`/utils/env.ts`)
- [x] Diagnostic tools added
- [x] Vercel project created
- [ ] Code pushed to GitHub

## Vercel Setup
- [ ] Environment variables set:
  - [ ] `VITE_BACKEND_URL` = `https://fancy-trader.up.railway.app`
  - [ ] `VITE_BACKEND_WS_URL` = `wss://fancy-trader.up.railway.app/ws`

## Deployment Steps
- [ ] **Step 1:** Push code to GitHub
- [ ] **Step 2:** Clear Vercel build cache (Settings → Build Cache → Clear)
- [ ] **Step 3:** Redeploy (Deployments → Redeploy → Uncheck "Use cache")
- [ ] **Step 4:** Wait for build (~2-3 minutes)

## Verification
- [ ] CSS Rules: **1000+** (not 4)
- [ ] Tailwind Loaded: **true** (not false)
- [ ] Diagnostic Badge: **Green** (not red/yellow)
- [ ] Visual styling works (cards, colors, shadows)
- [ ] Backend connection: **Connected** (green)

## Testing
- [ ] Search symbols works
- [ ] Add to watchlist works
- [ ] View trade details modal works
- [ ] Strategy settings modal works
- [ ] Discord alerts work (optional)

## Done! 🎉
- [ ] Remove diagnostic panel (optional)
- [ ] Start trading!

---

**Key Number to Watch:**
- CSS Rules: **4** = Broken ❌
- CSS Rules: **1247** = Working ✅
