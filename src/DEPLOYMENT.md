# Deployment Guide - Fancy Trader

Complete guide to deploy both frontend and backend.

## 🚀 Backend Deployment (Railway)

### Step 1: Prepare Backend

```bash
cd backend
npm install
```

### Step 2: Test Locally

```bash
# Create .env file
cp .env.example .env

# Add your credentials
POLYGON_API_KEY=your_polygon_api_key
DISCORD_WEBHOOK_URL=your_discord_webhook
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# Run locally
npm run dev
```

Test at `http://localhost:8080/health`

### Step 3: Deploy to Railway

**Option A: Using Railway CLI**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Set environment variables
railway variables set POLYGON_API_KEY=your_key
railway variables set DISCORD_WEBHOOK_URL=your_webhook
railway variables set DISCORD_ENABLED=true
railway variables set SUPABASE_URL=your_url
railway variables set SUPABASE_SERVICE_KEY=your_key
railway variables set NODE_ENV=production

# Deploy
railway up
```

**Option B: Using GitHub Integration**

1. Push your code to GitHub
2. Go to [Railway Dashboard](https://railway.app/)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Set root directory to `/backend`
6. Add environment variables in Settings:
   - `POLYGON_API_KEY`
   - `DISCORD_WEBHOOK_URL`
   - `DISCORD_ENABLED=true`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `NODE_ENV=production`
7. Click "Deploy"

### Step 4: Get Your Backend URL

After deployment, Railway will give you a URL like:
- `https://your-app.railway.app`

Note this URL for frontend configuration.

### Step 5: Test Backend

```bash
# Test health endpoint
curl https://your-app.railway.app/health

# Test WebSocket (use a WebSocket client)
wscat -c wss://your-app.railway.app/ws
```

---

## 🌐 Frontend Deployment (Vercel)

### Step 1: Update Backend Configuration

Edit `/config/backend.ts`:

```typescript
const PRODUCTION_HTTP_URL = 'https://your-app.railway.app';
const PRODUCTION_WS_URL = 'wss://your-app.railway.app/ws';
```

Or use environment variables:

Create `.env` file:
```env
VITE_BACKEND_URL=https://your-app.railway.app
VITE_BACKEND_WS_URL=wss://your-app.railway.app/ws
```

### Step 2: Test Locally with Production Backend

```bash
npm install
npm run dev
```

- Toggle "Go Live" button to connect to real backend
- Verify connection status shows "Live"
- Check browser console for connection messages

### Step 3: Deploy to Vercel

**Option A: Using Vercel CLI**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables
vercel env add VITE_BACKEND_URL
vercel env add VITE_BACKEND_WS_URL

# Deploy to production
vercel --prod
```

**Option B: Using GitHub Integration**

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New..." → "Project"
4. Import your GitHub repository
5. Configure:
   - Framework Preset: Vite
   - Root Directory: `./` (root)
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add Environment Variables:
   - `VITE_BACKEND_URL` = `https://your-app.railway.app`
   - `VITE_BACKEND_WS_URL` = `wss://your-app.railway.app/ws`
7. Click "Deploy"

### Step 4: Test Production Deployment

Visit your Vercel URL (e.g., `https://fancy-trader.vercel.app`)

1. Click "Go Live" button
2. Verify "Live" status appears
3. Check that trades load from backend
4. Test watchlist synchronization

---

## 🔐 Environment Variables Reference

### Backend (.env)

```env
# Required
PORT=8080
NODE_ENV=production
POLYGON_API_KEY=your_polygon_api_key
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_ENABLED=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Optional
FRONTEND_URL=https://fancy-trader.vercel.app
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env)

```env
# Production backend URLs
VITE_BACKEND_URL=https://your-app.railway.app
VITE_BACKEND_WS_URL=wss://your-app.railway.app/ws
```

---

## 🧪 Testing Your Deployment

### 1. Backend Health Check

```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### 2. WebSocket Connection

Open browser console on your frontend:

```javascript
const ws = new WebSocket('wss://your-app.railway.app/ws');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', e.data);
```

### 3. API Endpoint Test

```bash
# Get market status
curl https://your-app.railway.app/api/market/status

# Get active setups
curl https://your-app.railway.app/api/setups
```

### 4. Frontend Connection Test

1. Open your deployed frontend
2. Open browser DevTools → Console
3. Look for:
   - `[INFO] Connecting to WebSocket: wss://...`
   - `[INFO] WebSocket connected`
   - `[INFO] Backend health check passed`
   - `Connected to Backend` toast notification

---

## 🐛 Troubleshooting

### Backend Not Starting

**Check Railway logs:**
```bash
railway logs
```

Common issues:
- Missing environment variables
- Invalid Polygon API key
- Port binding issues (Railway handles this automatically)

### WebSocket Connection Failed

1. **Check backend URL in frontend config**
   - Should use `wss://` (not `ws://`) for HTTPS
   
2. **Verify CORS settings**
   - Backend CORS should allow your frontend URL

3. **Check firewall/proxy**
   - Some networks block WebSocket connections

### "Backend Connection Failed" Toast

1. **Verify backend is running**
   ```bash
   curl https://your-app.railway.app/health
   ```

2. **Check browser console for errors**
   - Look for network errors
   - Check WebSocket connection status

3. **Try mock data mode**
   - Click "Mock" button to use local data
   - Helps isolate if issue is with backend or frontend

### No Setups Appearing

1. **Check Polygon.io API status**
   - Verify API key is valid
   - Ensure you have streaming permissions

2. **Market hours**
   - Strategy detection primarily works during market hours
   - Check market status: `/api/market/status`

3. **Watchlist configuration**
   - Ensure symbols are added to watchlist
   - Verify symbols are enabled
   - Check backend is subscribed to symbols

### Discord Alerts Not Sending

1. **Verify webhook URL**
   - Test webhook manually with curl:
   ```bash
   curl -X POST YOUR_WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{"content": "Test message"}'
   ```

2. **Check environment variable**
   - `DISCORD_ENABLED=true`
   - `DISCORD_WEBHOOK_URL` is set correctly

3. **Check Railway logs**
   - Look for Discord-related errors

---

## 📊 Monitoring

### Railway Dashboard

Monitor:
- CPU usage
- Memory usage
- Network traffic
- Logs
- Deployments

### Vercel Dashboard

Monitor:
- Build status
- Deployment previews
- Analytics
- Error tracking

### Application Logs

**Backend logs (Railway):**
```bash
railway logs --tail
```

**Frontend logs:**
- Open browser DevTools → Console
- Check for connection errors
- Monitor WebSocket messages

---

## 🔄 Updating

### Backend Updates

```bash
cd backend
git pull
railway up
```

Or push to GitHub if using GitHub integration.

### Frontend Updates

```bash
git pull
vercel --prod
```

Or push to GitHub if using GitHub integration.

---

## 💰 Cost Estimation

### Railway (Backend)

- **Hobby Plan**: $5/month
  - 500 hours of execution time
  - Suitable for development

- **Pro Plan**: Usage-based
  - Pay only for what you use
  - Recommended for production

### Vercel (Frontend)

- **Free Hobby Plan**: $0/month
  - 100 GB bandwidth
  - Unlimited builds
  - Perfect for personal use

- **Pro Plan**: $20/month
  - 1 TB bandwidth
  - More team features

### Polygon.io (Data)

- **Starter**: $29/month
  - Real-time data
  - Suitable for personal trading

- **Advanced**: $99/month
  - Options data included
  - Higher rate limits

### Total Monthly Cost (Estimated)

- **Development**: ~$34/month (Railway Hobby + Polygon Starter)
- **Production**: ~$124/month (Railway Pro + Vercel Pro + Polygon Advanced)

---

## 🎯 Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Deploy frontend to Vercel
3. ✅ Test connection end-to-end
4. ✅ Configure Discord webhook
5. ✅ Add symbols to watchlist
6. ✅ Monitor for first setup detection
7. ✅ Receive Discord alert
8. 🚀 Start trading!

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Polygon.io API Docs](https://polygon.io/docs)
- [Discord Webhooks Guide](https://discord.com/developers/docs/resources/webhook)
- [Supabase Documentation](https://supabase.com/docs)

---

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Railway/Vercel logs
3. Check browser console for frontend errors
4. Verify all environment variables are set
5. Test each component individually (backend health, WebSocket, API calls)

**Common Issues:**
- ❌ Wrong backend URL in frontend config
- ❌ Missing environment variables
- ❌ Invalid API keys
- ❌ CORS configuration issues
- ❌ WebSocket blocked by firewall/proxy
