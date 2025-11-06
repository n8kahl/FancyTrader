# 🚀 Quick Start Guide - Fancy Trader

Get up and running in 10 minutes!

## 📋 Prerequisites

- Node.js 18+ installed
- Polygon.io (Massive.com) API key
- Discord webhook URL (optional)
- Supabase account (optional for persistence)

## 🏃 Local Development (5 minutes)

### 1. Start Backend

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add your Polygon API key
# POLYGON_API_KEY=your_key_here

# Start backend server
npm run dev
```

Backend should start at: `http://localhost:8080`

### 2. Start Frontend

```bash
# Open new terminal in project root
npm install

# Start frontend
npm run dev
```

Frontend should start at: `http://localhost:5173`

### 3. Test Connection

1. Open `http://localhost:5173` in your browser
2. Click the **"Go Live"** button in the header
3. You should see **"Live"** indicator with a green WiFi icon
4. A toast notification "Connected to Backend" should appear

✅ **Done!** You're now running Fancy Trader with live backend!

---

## 🚀 Production Deployment (15 minutes)

### 1. Deploy Backend to Railway

```bash
cd backend

# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init

# Set environment variables
railway variables set POLYGON_API_KEY=your_key_here
railway variables set DISCORD_WEBHOOK_URL=your_webhook_url
railway variables set DISCORD_ENABLED=true
railway variables set NODE_ENV=production

# Deploy
railway up
```

**Note your Railway URL:** `https://your-app.railway.app`

### 2. Update Frontend Configuration

Edit `/config/backend.ts`:

```typescript
const PRODUCTION_HTTP_URL = 'https://your-app.railway.app';
const PRODUCTION_WS_URL = 'wss://your-app.railway.app/ws';
```

### 3. Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables
vercel env add VITE_BACKEND_URL
# Enter: https://your-app.railway.app

vercel env add VITE_BACKEND_WS_URL
# Enter: wss://your-app.railway.app/ws

# Deploy to production
vercel --prod
```

**Your app is live!** 🎉

---

## 🧪 Verify Everything Works

### Test Backend

```bash
# Test health endpoint
curl https://your-app.railway.app/health

# Should return:
# {"status":"ok","timestamp":"...","uptime":123}
```

### Test Frontend Connection

1. Open your Vercel URL
2. Click "Go Live" button
3. Check for "Live" status indicator
4. Open browser DevTools → Console
5. Look for: `[INFO] WebSocket connected`

### Test Setup Detection

1. Add symbols to watchlist (AAPL, TSLA, SPY, etc.)
2. Wait for market hours (9:30 AM - 4:00 PM ET)
3. Watch for setup detection notifications
4. Check Discord for alerts

---

## 📊 Understanding the Data Flow

```
Market Opens
    ↓
Polygon.io streams real-time data
    ↓
Backend detects setups (ORB+PC, EMA Bounce, etc.)
    ↓
WebSocket broadcasts to frontend
    ↓
Toast notification appears
    ↓
Setup card appears in grid/list
    ↓
Discord alert sent (if enabled)
```

---

## 🎯 Key Features to Try

### 1. Setup Detection

- Add AAPL, TSLA, SPY to watchlist
- Watch for "New Setup Detected!" notifications
- Click setup card to see details

### 2. Options Trading

- Click "Load Contract" on any setup
- Select expiration and strike
- View full Greeks (Delta, Gamma, Theta, Vega)
- Enter position and track P&L

### 3. Discord Alerts

- Configure webhook in backend `.env`
- Setups automatically post to Discord
- Rich embeds with all trade details

### 4. Confluence Analysis

- Each setup shows confluence score (1-10)
- Key factors: EMA alignment, RSI, VWAP, volume
- Patient Candle identification
- Support/resistance levels

### 5. Strategy Filtering

- Click "Strategies" button
- Enable/disable specific setups
- Use presets (Scalping, Swing, etc.)

---

## 🔧 Common Commands

### Backend

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# View logs (Railway)
railway logs --tail
```

### Frontend

```bash
# Development
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Deploy (Vercel)
vercel --prod
```

---

## 🐛 Troubleshooting

### Backend Not Connecting

**Check:**
1. Backend is running: `curl http://localhost:8080/health`
2. Port 8080 is available
3. Polygon API key is valid

**Fix:**
```bash
cd backend
npm run dev
# Check for error messages
```

### WebSocket Not Connecting

**Check:**
1. WebSocket URL is correct in `/config/backend.ts`
2. Using `ws://` for local, `wss://` for production
3. No firewall blocking WebSocket

**Fix:**
- Test WebSocket in browser console:
```javascript
const ws = new WebSocket('ws://localhost:8080/ws');
ws.onopen = () => console.log('Connected!');
```

### No Setups Appearing

**Check:**
1. Market is open (9:30 AM - 4:00 PM ET)
2. Symbols added to watchlist
3. Backend logs show "Subscribed to symbols"

**Fix:**
- Check market status:
```bash
curl http://localhost:8080/api/market/status
```

### "Backend Connection Failed" Toast

**This is normal if:**
- Backend is not running
- Using mock data mode
- API key is invalid

**Fix:**
- Click "Mock" button to use local data
- Or fix backend connection and click "Go Live"

---

## 📖 Next Steps

### Learn More

- [Complete Documentation](/docs/Backend-Integration.md)
- [Deployment Guide](/DEPLOYMENT.md)
- [Strategy Library](/docs/Complete-Strategy-Library.md)
- [Options Trading](/docs/Options-Trading-System.md)

### Customize

- Modify strategies in `/config/strategies.ts`
- Add symbols in `/config/watchlist.ts`
- Adjust confluence factors in backend `/services/strategyDetector.ts`

### Scale Up

- Add more symbols to watchlist
- Deploy to production
- Enable Discord alerts
- Configure Supabase for persistence
- Add custom strategies

---

## 💡 Pro Tips

1. **Start with a few symbols** - Don't overwhelm yourself
2. **Use mock data first** - Understand the UI before going live
3. **Monitor during market hours** - Setups detected in real-time
4. **Check confluence score** - Higher score = higher probability
5. **Set price alerts** - Get notified when setups form
6. **Review Discord alerts** - Stay informed on mobile
7. **Track your trades** - Use the options contract system
8. **Backtest strategies** - Use historical data endpoint

---

## 🎉 You're Ready!

You now have a complete real-time trading setup monitor with:
- ✅ Live market data streaming
- ✅ Automated setup detection
- ✅ Options contract selection
- ✅ P&L tracking
- ✅ Discord alerts
- ✅ Mobile-friendly interface

**Start Trading Smarter! 📈**

---

## 🆘 Need Help?

1. Check the [Troubleshooting Guide](#-troubleshooting)
2. Review [Backend Integration Docs](/docs/Backend-Integration.md)
3. Check browser console for errors
4. Review backend logs
5. Test each component individually

## 📞 Support Resources

- **Polygon.io API:** https://polygon.io/docs
- **Railway Docs:** https://docs.railway.app
- **Vercel Docs:** https://vercel.com/docs
- **Discord Webhooks:** https://discord.com/developers/docs/resources/webhook

---

Happy Trading! 🚀📈💰
