# 🚂 Railway Environment Variables - What to Enter

Based on your screenshot, here's exactly what to put in each field:

---

## 📋 Required Variables (Must Fill These!)

### 1. **POLYGON_API_KEY**

```
Value: Your actual Polygon.io (Massive.com) API key
Example: uosELfJI6uD7coqZa2gkzuJINkdEa6s2
```

**Where to get it:**

1. Go to https://polygon.io/dashboard/api-keys
2. Or https://massive.com (if that's your plan)
3. Copy your API key
4. Paste it in Railway

✅ **This is REQUIRED** - backend won't work without it

---

### 2. **DISCORD_WEBHOOK_URL**

```
Value: Your Discord webhook URL
Example: https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz
```

**Where to get it:**

1. Open Discord → Go to your server
2. Right-click the channel you want alerts in
3. Edit Channel → Integrations → Webhooks
4. Click "New Webhook"
5. Name it "Fancy Trader Alerts"
6. Copy Webhook URL
7. Paste it in Railway

✅ **REQUIRED for Discord alerts**

---

### 3. **DISCORD_ENABLED**

```
Value: true
```

Just type: `true` (lowercase)

✅ **REQUIRED** - Set to `true` to enable Discord alerts

---

### 4. **SUPABASE_URL**

```
Value: Your Supabase project URL
Example: https://abcdefghijklmnop.supabase.co
```

**Where to get it:**

1. Go to https://supabase.com/dashboard
2. Select your project (or create one)
3. Go to Settings → API
4. Copy "Project URL"
5. Paste it in Railway

✅ **REQUIRED for database features**

---

### 5. **SUPABASE_SERVICE_KEY**

```
Value: Your Supabase service role key (SECRET!)
Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
```

**Where to get it:**

1. Supabase Dashboard → Settings → API
2. Find "service_role secret" under "Project API keys"
3. Click "Reveal" and copy the **long key** (starts with `eyJ...`)
4. Paste it in Railway

⚠️ **IMPORTANT**: This is the **service_role** key, NOT the anon key!

✅ **REQUIRED for database features**

---

## 🔧 Optional Variables (Can Skip for Now)

### 6. **FRONTEND_URL**

```
Value: Your Vercel frontend URL (add this AFTER deploying frontend)
Example: https://fancy-trader.vercel.app
```

**When to add:**

- Leave BLANK for now
- Add it AFTER you deploy frontend to Vercel
- Used for CORS security

❌ **Can be empty during initial deployment**

---

## 🎯 Additional Variables to Add Manually

Railway auto-detected most variables, but you should also add these:

### Click "+ New Variable" and add:

**NODE_ENV**

```
Value: production
```

**PORT** (optional - Railway sets this automatically)

```
Value: 8080
```

---

## 📸 How to Fill Them In (Step by Step)

Looking at your screenshot:

1. **SUPABASE_URL**
   - Click the "VALUE or ${REF}" field
   - Paste: `https://YOUR-PROJECT.supabase.co`
2. **SUPABASE_SERVICE_KEY**
   - Click the "VALUE or ${REF}" field
   - Paste your long service role key
3. **FRONTEND_URL**
   - **SKIP FOR NOW** (add after Vercel deployment)
4. **DISCORD_WEBHOOK_URL**
   - Click the "VALUE or ${REF}" field
   - Paste: `https://discord.com/api/webhooks/...`
5. **DISCORD_ENABLED**
   - Click the "VALUE or ${REF}" field
   - Type: `true`
6. **POLYGON_API_KEY**
   - **Already filled in your screenshot!** ✅
   - Looks like: `uosELfJI6uD7coqZa2gkzuJINkdEa6s2`

---

## ✅ Final Checklist

After filling in all variables, you should have:

- [x] **POLYGON_API_KEY** = `uosELfJI...` (already filled)
- [ ] **DISCORD_WEBHOOK_URL** = `https://discord.com/api/webhooks/...`
- [ ] **DISCORD_ENABLED** = `true`
- [ ] **SUPABASE_URL** = `https://your-project.supabase.co`
- [ ] **SUPABASE_SERVICE_KEY** = `eyJhbGciOiJIUzI1NiIs...`
- [ ] **FRONTEND_URL** = SKIP (add later)
- [ ] **NODE_ENV** = `production` (click "+ New Variable")

---

## 🔐 Security Notes

### ⚠️ NEVER Share These Keys Publicly:

- ❌ POLYGON_API_KEY
- ❌ SUPABASE_SERVICE_KEY (especially this one!)
- ❌ DISCORD_WEBHOOK_URL

### ✅ Safe to Share:

- ✅ SUPABASE_URL (the project URL is public)
- ✅ FRONTEND_URL (your website URL)

---

## 🆘 Don't Have Supabase Yet?

### Quick Supabase Setup (5 minutes):

1. **Go to**: https://supabase.com/dashboard
2. **Click**: "New Project"
3. **Fill in**:
   - Name: `fancy-trader`
   - Database Password: (generate one)
   - Region: Choose closest to you
4. **Wait 2-3 minutes** for setup
5. **Go to**: Settings → API
6. **Copy**:
   - Project URL → `SUPABASE_URL`
   - service_role key → `SUPABASE_SERVICE_KEY`

✅ **Free tier includes**: 500MB database, 1GB storage - perfect for this app!

---

## 🆘 Don't Have Discord Webhook Yet?

### Quick Discord Webhook Setup (2 minutes):

1. **Open Discord** on desktop
2. **Go to your server** (or create one)
3. **Create a channel** called `#trading-alerts`
4. **Right-click the channel** → "Edit Channel"
5. **Go to**: Integrations → Webhooks
6. **Click**: "New Webhook"
7. **Name it**: "Fancy Trader"
8. **Click**: "Copy Webhook URL"
9. **Paste in Railway**

---

## 🚀 After Adding Variables

1. **Click "Add"** button (bottom right in your screenshot)
2. Railway will **redeploy automatically**
3. **Wait 2-3 minutes**
4. **Test your backend**:
   ```bash
   curl https://your-app.railway.app/health
   ```

---

## 📝 Example of Filled Variables

Here's what it should look like when done:

```
POLYGON_API_KEY           = uosELfJI6uD7coqZa2gkzuJINkdEa6s2
DISCORD_WEBHOOK_URL       = https://discord.com/api/webhooks/123456789/abcdef
DISCORD_ENABLED           = true
SUPABASE_URL              = https://myproject.supabase.co
SUPABASE_SERVICE_KEY      = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
FRONTEND_URL              = (leave blank for now)
NODE_ENV                  = production
```

---

## ✅ You're Ready!

Once you click "Add", Railway will:

1. ✅ Save your variables
2. ✅ Redeploy your backend
3. ✅ Connect to Polygon.io
4. ✅ Connect to Supabase
5. ✅ Enable Discord alerts

**Next step**: Deploy your frontend to Vercel!
