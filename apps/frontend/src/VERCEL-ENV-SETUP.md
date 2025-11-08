# ▲ Vercel Environment Variables Setup

## 🎯 Frontend Environment Configuration

Your frontend needs to know where the backend is located.

---

## 📋 Required Vercel Environment Variables

Go to: **Vercel Dashboard → fancy-trader → Settings → Environment Variables**

### **1. VITE_BACKEND_URL**

The HTTP endpoint for your Railway backend.

**Name:** `VITE_BACKEND_URL`  
**Value:** `https://fancy-trader.up.railway.app`

**Environment:** All (Production, Preview, Development)

---

### **2. VITE_BACKEND_WS_URL**

The WebSocket endpoint for your Railway backend.

**Name:** `VITE_BACKEND_WS_URL`  
**Value:** `wss://fancy-trader.up.railway.app/ws`

**Environment:** All (Production, Preview, Development)

---

## 🚀 Quick Setup Steps

### Step 1: Open Vercel Settings

1. Go to: https://vercel.com/dashboard
2. Select: **fancy-trader** project
3. Click: **Settings** tab
4. Click: **Environment Variables** (left sidebar)

### Step 2: Add Variables

For each variable:

1. Click **"Add New"**
2. Enter **Name:** `VITE_BACKEND_URL`
3. Enter **Value:** `https://fancy-trader.up.railway.app`
4. Select **All environments** (Production, Preview, Development)
5. Click **"Save"**

Repeat for `VITE_BACKEND_WS_URL`

### Step 3: Redeploy

Environment variables only take effect on new deployments.

**Option A: Trigger redeploy from Vercel**

1. Go to **Deployments** tab
2. Find latest deployment
3. Click ⋯ (three dots)
4. Click **Redeploy**
5. Click **Redeploy** again to confirm

**Option B: Push to GitHub**

```bash
git commit --allow-empty -m "Trigger redeploy for env vars"
git push
```

---

## 📊 Current Values

Based on your setup, use these exact values:

| Variable              | Value                                  | Notes               |
| --------------------- | -------------------------------------- | ------------------- |
| `VITE_BACKEND_URL`    | `https://fancy-trader.up.railway.app`  | No trailing slash   |
| `VITE_BACKEND_WS_URL` | `wss://fancy-trader.up.railway.app/ws` | Note the `/ws` path |

---

## 🧪 Verify Configuration

### Method 1: Check in Browser Console

After redeploying, open your frontend and check the console logs:

```javascript
// Look for this in the startup logs:
🌐 BACKEND CONFIGURATION:
  HTTP URL: https://fancy-trader.up.railway.app
  WebSocket URL: wss://fancy-trader.up.railway.app/ws
```

If the URLs are correct, environment variables are working! ✅

### Method 2: Test Button

1. Open frontend
2. Click **"Test"** button
3. Click **"Run Connection Tests"**
4. Should show correct URLs in test modal
5. All 4 tests should pass ✅

---

## ⚠️ Common Mistakes

### ❌ Wrong: Including `/api` in the URL

```
VITE_BACKEND_URL = https://fancy-trader.up.railway.app/api  ❌
```

### ✅ Correct: Base URL only

```
VITE_BACKEND_URL = https://fancy-trader.up.railway.app  ✅
```

The `/api` prefix is added by the frontend code automatically in specific endpoints.

---

### ❌ Wrong: Using `http://` for WebSocket

```
VITE_BACKEND_WS_URL = http://fancy-trader.up.railway.app/ws  ❌
```

### ✅ Correct: Using `wss://` for secure WebSocket

```
VITE_BACKEND_WS_URL = wss://fancy-trader.up.railway.app/ws  ✅
```

---

### ❌ Wrong: Trailing slash

```
VITE_BACKEND_URL = https://fancy-trader.up.railway.app/  ❌
```

### ✅ Correct: No trailing slash

```
VITE_BACKEND_URL = https://fancy-trader.up.railway.app  ✅
```

---

## 🔍 Path Verification

### Health Endpoint

The frontend calls:

```
GET https://fancy-trader.up.railway.app/health
```

**Verify it works:**

```bash
curl https://fancy-trader.up.railway.app/health
```

**Expected:**

```json
{ "status": "ok", "timestamp": "...", "uptime": 12345 }
```

### WebSocket Endpoint

The frontend connects to:

```
wss://fancy-trader.up.railway.app/ws
```

**Verify path in backend:**

```typescript
// In backend/src/index.ts line 19:
const wss = new WebSocketServer({ server, path: '/ws' });
                                                    ^^^^
```

If your backend WebSocket is at a different path (e.g., `/ws/stream`), update the Vercel env var:

```
VITE_BACKEND_WS_URL = wss://fancy-trader.up.railway.app/ws/stream
```

---

## 🐛 Troubleshooting

### Issue: Frontend still shows old URLs

**Cause:** Environment variables only apply to new builds

**Fix:**

1. Redeploy from Vercel dashboard, OR
2. Push any commit to trigger rebuild

### Issue: `undefined` in console logs

**Cause:** Environment variable names don't start with `VITE_`

**Fix:** Vite only exposes env vars that start with `VITE_`

- ✅ `VITE_BACKEND_URL` (correct)
- ❌ `BACKEND_URL` (won't work in Vite)

### Issue: Different URLs in Preview vs Production

**Cause:** Environment variables set for different environments

**Fix:**

1. Go to Vercel Settings → Environment Variables
2. Edit each variable
3. Check **ALL** environments are selected:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

---

## 📊 Environment Variables Checklist

Before deploying:

- [ ] `VITE_BACKEND_URL` is set
- [ ] Value is `https://fancy-trader.up.railway.app` (no trailing slash)
- [ ] `VITE_BACKEND_WS_URL` is set
- [ ] Value is `wss://fancy-trader.up.railway.app/ws`
- [ ] Both variables are set for **All environments**
- [ ] Redeployed after adding variables
- [ ] Console logs show correct URLs
- [ ] Test button shows correct URLs
- [ ] Connection tests pass

---

## 🎯 Complete Configuration

**Vercel Environment Variables:**

```
VITE_BACKEND_URL = https://fancy-trader.up.railway.app
VITE_BACKEND_WS_URL = wss://fancy-trader.up.railway.app/ws
```

**Railway Environment Variables:**

```
FRONTEND_ORIGINS = https://fancy-trader.vercel.app
POLYGON_API_KEY = your_key
DISCORD_WEBHOOK_URL = your_webhook
SUPABASE_URL = your_url
SUPABASE_SERVICE_ROLE_KEY = your_key
```

---

## 🚀 Final Steps

1. ✅ Add environment variables in Vercel
2. ✅ Redeploy frontend
3. ✅ Check console logs show correct URLs
4. ✅ Click "Test" button
5. ✅ All tests pass
6. ✅ Click "Go Live"
7. ✅ Real data appears! 🎉

---

**After setting these variables and redeploying, your frontend will connect to the Railway backend!** ▲
