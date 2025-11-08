# 🚂 Railway Environment Variables Setup

## 🎯 CRITICAL: Update CORS Configuration

Your backend now has proper CORS handling that supports:

- ✅ Production URL
- ✅ Preview deployments (fancy-trader-abc123.vercel.app)
- ✅ Local development
- ✅ Multiple frontends

---

## 📋 Required Railway Environment Variables

Go to: **https://railway.app → fancy-trader → Backend Service → Variables**

### **1. FRONTEND_ORIGINS** (NEW - REQUIRED)

Set this to your production frontend URL(s). Multiple URLs can be comma-separated.

**Value:**

```
https://fancy-trader.vercel.app
```

**Or for multiple URLs:**

```
https://fancy-trader.vercel.app,https://fancy-trader2.vercel.app,https://fancy-trader.netlify.app
```

**Default if not set:**

- `http://localhost:5173`
- `https://fancy-trader.vercel.app`

---

### **2. Other Required Variables**

Make sure these are also set:

| Variable                    | Example Value                          | Required                     |
| --------------------------- | -------------------------------------- | ---------------------------- |
| `POLYGON_API_KEY`           | `your_polygon_api_key`                 | ✅ Yes                       |
| `DISCORD_WEBHOOK_URL`       | `https://discord.com/api/webhooks/...` | ✅ Yes                       |
| `SUPABASE_URL`              | `https://xxxxx.supabase.co`            | ✅ Yes                       |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...`                           | ✅ Yes                       |
| `PORT`                      | `8080`                                 | Optional (Railway auto-sets) |

---

## 🚀 Quick Setup Steps

### Step 1: Go to Railway Variables

1. Open: https://railway.app
2. Select: **fancy-trader** project
3. Click: Backend service (Node.js/Express)
4. Click: **Variables** tab

### Step 2: Update/Add FRONTEND_ORIGINS

**If variable exists:**

- Click Edit button
- Change value to: `https://fancy-trader.vercel.app`
- Click Save

**If variable doesn't exist:**

- Click "New Variable"
- Name: `FRONTEND_ORIGINS`
- Value: `https://fancy-trader.vercel.app`
- Click Add

### Step 3: Redeploy

Railway will automatically redeploy when you save variables.

**Wait time:** 60-90 seconds

---

## 🧪 Test After Deploy

### Test 1: CORS Preflight (OPTIONS)

```bash
curl -I -X OPTIONS \
  -H "Origin: https://fancy-trader.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  https://fancy-trader.up.railway.app/health
```

**Expected response headers:**

```
Access-Control-Allow-Origin: https://fancy-trader.vercel.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
```

### Test 2: Health Endpoint

```bash
curl -H "Origin: https://fancy-trader.vercel.app" \
     https://fancy-trader.up.railway.app/health
```

**Expected response:**

```json
{
  "status": "ok",
  "timestamp": "2025-11-06T...",
  "uptime": 12345
}
```

### Test 3: From Browser

Open frontend → Click **"Test"** button → All 4 tests should pass ✅

---

## 🎨 What Changed in the Code

### Old CORS (BEFORE):

```typescript
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
```

**Problem:** Only allows ONE exact URL

### New CORS (AFTER):

```typescript
const allowedOrigins = process.env.FRONTEND_ORIGINS
  ? process.env.FRONTEND_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "https://fancy-trader.vercel.app"];

const previewRegex = /^https:\/\/fancy-trader(-[a-z0-9]+)?\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (previewRegex.test(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
```

**Benefits:**

- ✅ Supports multiple exact URLs (comma-separated)
- ✅ Automatically allows Vercel preview URLs (fancy-trader-xyz.vercel.app)
- ✅ Proper error messages when origin is blocked
- ✅ Explicit methods and headers

---

## 🔍 Preview URL Support

The regex pattern automatically allows:

- `https://fancy-trader.vercel.app` ✅
- `https://fancy-trader-abc123.vercel.app` ✅ (preview)
- `https://fancy-trader-git-feature-user.vercel.app` ✅ (git branch)

But blocks:

- `https://malicious-site.com` ❌
- `https://other-app.vercel.app` ❌

---

## 🐛 Troubleshooting

### Issue: "Origin not allowed by CORS" in Railway logs

**Cause:** The origin isn't in `FRONTEND_ORIGINS` and doesn't match the preview regex

**Fix:** Add the origin to `FRONTEND_ORIGINS`:

```
https://fancy-trader.vercel.app,https://new-frontend.vercel.app
```

### Issue: Still getting CORS errors

**Check:**

1. Railway variables are saved
2. Backend redeployed (check Railway dashboard)
3. No typos in URLs (https, not http)
4. No trailing slashes in URLs

**Debug:**

```bash
# Check what Railway sees
railway logs

# Should show CORS configuration on startup
```

### Issue: Preview deployments still blocked

**Cause:** Preview URL doesn't match the regex pattern

**Fix:**
If your preview URLs have a different format, update the regex in `backend/src/index.ts`:

```typescript
// Example: For Netlify previews
const previewRegex = /^https:\/\/fancy-trader(-[a-z0-9]+)?\.netlify\.app$/;

// Example: For both Vercel and Netlify
const vercelPreview = /^https:\/\/fancy-trader(-[a-z0-9]+)?\.vercel\.app$/;
const netlifyPreview = /^https:\/\/fancy-trader(-[a-z0-9]+)?\.netlify\.app$/;

// In the origin callback:
if (vercelPreview.test(origin) || netlifyPreview.test(origin)) {
  return callback(null, true);
}
```

---

## 📊 Verification Checklist

After updating Railway variables:

- [ ] `FRONTEND_ORIGINS` is set to correct URL
- [ ] Backend redeployed (Railway dashboard shows "Deployed")
- [ ] `curl` test shows correct CORS headers
- [ ] Frontend "Test" button passes all 4 tests
- [ ] "Go Live" connects successfully
- [ ] Real data appears (not mock data)
- [ ] Preview deployments work (if applicable)

---

## 🎯 Final Configuration

**Railway Variables (minimum required):**

```
FRONTEND_ORIGINS = https://fancy-trader.vercel.app
POLYGON_API_KEY = your_key_here
DISCORD_WEBHOOK_URL = your_webhook_here
SUPABASE_URL = your_supabase_url
SUPABASE_SERVICE_ROLE_KEY = your_key_here
```

**Optional:**

```
PORT = 8080  (Railway auto-sets this)
NODE_ENV = production
```

---

## 🚀 Next Steps

1. ✅ Push backend code changes to GitHub
2. ✅ Railway auto-deploys
3. ✅ Set `FRONTEND_ORIGINS` variable in Railway
4. ✅ Wait for redeploy (~90 seconds)
5. ✅ Test with curl commands
6. ✅ Test with frontend "Test" button
7. ✅ Click "Go Live"
8. ✅ Success! Real data! 🎉

---

**The backend code is now fixed. Just update the Railway environment variable and you're done!** 🚂
