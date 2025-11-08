# 🚀 Simple Deployment Checklist

**TL;DR**: Your code is currently only in Figma Make. You need to push it to GitHub, then deploy backend to Railway and frontend to Vercel.

---

## ✅ What You Have Now

- ✅ Complete frontend code (React app)
- ✅ Complete backend code (Node.js server)
- ✅ Everything is in Figma Make (this tool)
- ❌ Code is NOT in GitHub yet
- ❌ Code is NOT deployed to Railway yet
- ❌ Code is NOT deployed to Vercel yet

---

## 📦 Where Each Part Goes

| Code Part                                 | Current Location | Final Destination | Purpose                                       |
| ----------------------------------------- | ---------------- | ----------------- | --------------------------------------------- |
| **Frontend** (App.tsx, components/, etc.) | Figma Make       | **Vercel**        | Your web app that users see                   |
| **Backend** (backend/src/)                | Figma Make       | **Railway**       | Server that gets market data & detects setups |
| **Database**                              | -                | **Supabase**      | Stores watchlists & setup history             |

---

## 🎯 Step-by-Step Deployment Process

### Step 1: Get Code into GitHub (REQUIRED FIRST!)

**You need to do this before deploying to Railway or Vercel.**

1. **Download ALL your code from Figma Make**

   - Download the entire project as a ZIP file
   - Extract it to your computer

2. **Create a GitHub repository**

   ```bash
   # On your computer, navigate to the extracted folder
   cd fancy-trader

   # Initialize git
   git init

   # Add all files
   git add .

   # Make first commit
   git commit -m "Initial commit - Fancy Trader"

   # Create repo on GitHub.com and push
   git remote add origin https://github.com/YOUR_USERNAME/fancy-trader.git
   git branch -M main
   git push -u origin main
   ```

   **OR** use GitHub Desktop (easier):

   - Download GitHub Desktop: https://desktop.github.com/
   - Click "Add" → "Add Existing Repository"
   - Select your fancy-trader folder
   - Click "Publish repository"

✅ **After this step**: Your code is in GitHub!

---

### Step 2: Deploy Backend to Railway

**What goes here**: Everything in the `/backend` folder

1. **Sign up for Railway**

   - Go to: https://railway.app/
   - Sign in with your GitHub account

2. **Create new project**

   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `fancy-trader` repository
   - **IMPORTANT**: Set "Root Directory" to `/backend`

3. **Add environment variables** (in Railway dashboard → Settings → Variables)

   ```
   POLYGON_API_KEY=your_polygon_key_from_massive.com
   DISCORD_WEBHOOK_URL=your_discord_webhook_url
   DISCORD_ENABLED=true
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   NODE_ENV=production
   PORT=8080
   ```

4. **Deploy**

   - Railway will automatically build and deploy
   - Wait 2-3 minutes
   - You'll get a URL like: `https://fancy-trader-production.up.railway.app`

5. **Test it works**
   ```bash
   curl https://your-app.railway.app/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

✅ **After this step**: Backend is live on Railway!

---

### Step 3: Update Frontend Configuration

**Before deploying frontend, you need to tell it where your backend is.**

Edit the file `/config/backend.ts`:

```typescript
// Change these to your Railway URLs
const PRODUCTION_HTTP_URL = "https://YOUR-APP-NAME.railway.app";
const PRODUCTION_WS_URL = "wss://YOUR-APP-NAME.railway.app/ws";
```

Commit and push this change:

```bash
git add config/backend.ts
git commit -m "Update backend URLs"
git push
```

---

### Step 4: Deploy Frontend to Vercel

**What goes here**: Everything EXCEPT the `/backend` folder (the root-level React app)

1. **Sign up for Vercel**

   - Go to: https://vercel.com
   - Sign in with your GitHub account

2. **Create new project**

   - Click "Add New..." → "Project"
   - Import your `fancy-trader` repository
   - Vercel will auto-detect it's a Vite app

3. **Configure build settings**

   - Framework Preset: **Vite**
   - Root Directory: **`./`** (leave as root)
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Add environment variables** (optional, but recommended)

   ```
   VITE_BACKEND_URL=https://your-app.railway.app
   VITE_BACKEND_WS_URL=wss://your-app.railway.app/ws
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - You'll get a URL like: `https://fancy-trader.vercel.app`

✅ **After this step**: Frontend is live on Vercel!

---

### Step 5: Test Everything Works

1. **Open your Vercel URL** (e.g., `https://fancy-trader.vercel.app`)

2. **Click "Go Live" button** in the top header

3. **You should see**:

   - "Live" indicator with green WiFi icon
   - Toast: "Connected to Backend"
   - In browser console: `[INFO] WebSocket connected`

4. **Add symbols to watchlist**:

   - Click "Watchlist" button
   - Add AAPL, TSLA, SPY
   - Save

5. **Wait for market hours** (9:30 AM - 4:00 PM ET)
   - Setups will be detected automatically
   - Discord alerts will be sent

---

## 🔄 Making Updates After Deployment

### To update frontend:

```bash
# Make changes in your code
git add .
git commit -m "Your change description"
git push
# Vercel will automatically redeploy
```

### To update backend:

```bash
# Make changes in your code
git add .
git commit -m "Your change description"
git push
# Railway will automatically redeploy
```

Both services will auto-deploy when you push to GitHub!

---

## 📁 Directory Structure Recap

```
fancy-trader/                    ← GitHub repo (root)
├── App.tsx                      ← Frontend (goes to Vercel)
├── components/                  ← Frontend (goes to Vercel)
├── config/                      ← Frontend (goes to Vercel)
├── hooks/                       ← Frontend (goes to Vercel)
├── services/                    ← Frontend (goes to Vercel)
├── backend/                     ← Backend (goes to Railway)
│   ├── src/
│   │   ├── index.ts
│   │   ├── services/
│   │   ├── routes/
│   │   └── ...
│   ├── package.json
│   └── tsconfig.json
├── package.json                 ← Frontend package.json
└── vite.config.ts              ← Frontend build config
```

**Key Points**:

- Railway only needs the `/backend` folder (set as root directory in Railway settings)
- Vercel needs everything EXCEPT `/backend` (uses the root package.json)
- Both deploy from the same GitHub repo, just different directories

---

## 💰 Costs

| Service             | Plan      | Cost         | Notes                           |
| ------------------- | --------- | ------------ | ------------------------------- |
| **Railway**         | Hobby     | $5/month     | For backend server              |
| **Vercel**          | Free      | $0           | Perfect for this project        |
| **Supabase**        | Free      | $0           | 500MB database, plenty for this |
| **Polygon/Massive** | Your plan | $29-99/month | You already have this           |

**Total new costs**: $5/month (Railway only)

---

## ❓ Common Questions

**Q: Do I need to deploy both backend and frontend?**  
A: Yes! Backend runs on Railway, frontend runs on Vercel. They talk to each other.

**Q: Can I use a different hosting service?**  
A: Yes, but Railway and Vercel are recommended because they have free tiers and easy GitHub integration.

**Q: What if I don't want to use GitHub?**  
A: You can deploy directly using CLI tools, but GitHub integration makes updates automatic.

**Q: How do I update the code after deploying?**  
A: Just push to GitHub and both services will auto-redeploy. That's the beauty of GitHub integration!

**Q: What's the `/supabase/functions/server` folder for?**  
A: That's a leftover from Figma Make's backend system. You don't need it since you're using the `/backend` folder with Railway.

**Q: Can I run everything locally first?**  
A: Yes! See QUICKSTART.md for local development instructions.

---

## 🆘 Still Confused?

**Start here**:

1. ✅ Download your code from Figma Make
2. ✅ Push it to GitHub (use GitHub Desktop if you're not comfortable with CLI)
3. ✅ Deploy backend to Railway (connect GitHub repo, set root to `/backend`)
4. ✅ Deploy frontend to Vercel (connect GitHub repo, use root directory)

**That's it!** Both services will handle the rest automatically.

---

## 📞 Quick Help

- **Railway Issues**: https://railway.app/help
- **Vercel Issues**: https://vercel.com/help
- **GitHub Help**: https://docs.github.com/

**Next Steps**: Follow the steps above in order. Start with getting your code into GitHub!
