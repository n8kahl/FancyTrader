# 🧪 Fancy Trader Testing Guide

Your application is now fully deployed! Follow these steps to test the integration.

## 🌐 Deployment URLs

- **Frontend (Vercel):** https://fancy-trader2.vercel.app
- **Backend (Railway):** https://fancy-trader.up.railway.app

---

## ✅ Step 1: Test Backend Health

Open this URL in your browser:

```
https://fancy-trader.up.railway.app/health
```

**Expected Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-06T...",
  "services": {
    "polygon": "connected",
    "supabase": "connected"
  }
}
```

---

## ✅ Step 2: Open the Frontend

1. Go to: **https://fancy-trader2.vercel.app**
2. You should see the Fancy Trader dashboard

---

## ✅ Step 3: Check Connection Status

Look at the **top-right corner** of the dashboard:

- 🟢 **Green badge** = Connected to Railway backend
- 🔴 **Red badge** = Disconnected
- 🟡 **Yellow badge** = Connecting...

**If you see RED:**

- Open browser DevTools (F12)
- Check the Console tab for error messages
- Check the Network tab for failed requests

---

## ✅ Step 4: Test Watchlist Manager

1. Click the **"Manage Watchlist"** button
2. Add a test symbol (e.g., `SPY`, `AAPL`, `TSLA`)
3. Click "Save Watchlist"
4. Verify the symbol appears in your watchlist

**This tests:**

- Frontend → Backend API calls
- Backend → Supabase database writes
- Data persistence

---

## ✅ Step 5: Test Real-Time Data (Market Hours Only)

**⚠️ This only works during market hours (9:30 AM - 4:00 PM ET)**

1. Add symbols to your watchlist (e.g., `SPY`, `AAPL`)
2. Watch the **Active Trades Panel**
3. Look for setups appearing in real-time

**What you should see:**

- Strategy badges (ORB+PC, EMA Bounce, etc.)
- Live price updates
- Confluence indicators
- Entry progress indicators

**WebSocket Connection:**

- The connection status badge should show 🟢 Green
- Data should update every 1-2 seconds

---

## ✅ Step 6: Test Strategy Settings

1. Click the **"Strategy Settings"** button (gear icon)
2. Enable/disable different strategies
3. Adjust risk parameters (e.g., max risk per trade)
4. Save settings
5. Verify settings persist on page reload

---

## ✅ Step 7: Test Trade Details Modal

1. Wait for a setup to appear (or use the mock data generator)
2. Click on a trade card
3. Verify the modal shows:
   - Candlestick chart
   - Confluence indicators
   - Entry/exit levels
   - Risk/reward ratios
   - Patient candle visualizer

---

## ✅ Step 8: Test Discord Alerts (Optional)

If you want to test Discord alerts:

1. Set up a Discord webhook URL in Railway:

   - Go to Railway dashboard
   - Add environment variable: `DISCORD_WEBHOOK_URL`
   - Get webhook from Discord: Server Settings → Integrations → Webhooks

2. Click on a trade in the frontend
3. Click "Send Discord Alert"
4. Check your Discord channel for the alert

---

## 🐛 Troubleshooting

### Backend Not Responding

**Problem:** Frontend shows "Disconnected" or 502 errors

**Solution:**

1. Check Railway logs:
   ```
   Railway Dashboard → fancy-trader → Deployments → View Logs
   ```
2. Look for startup errors
3. Verify environment variables are set:
   - `POLYGON_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### WebSocket Not Connecting

**Problem:** Real-time data not updating

**Solution:**

1. Check browser console for WebSocket errors
2. Verify Railway backend is running (health check)
3. Make sure you're using `wss://` (not `ws://`) in production

### No Setups Appearing

**Problem:** Dashboard is empty during market hours

**Possible Causes:**

- Market is closed (check market hours)
- Watchlist is empty (add symbols)
- Strategies are disabled (check strategy settings)
- Polygon streaming service isn't running (check Railway logs)

### CORS Errors

**Problem:** Browser console shows CORS errors

**Solution:**

1. Verify backend has CORS enabled (should be automatic)
2. Check Railway logs for CORS configuration
3. Ensure frontend is using correct backend URL

---

## 📊 Expected Behavior During Market Hours

### Pre-Market (4:00 AM - 9:30 AM ET)

- Frontend loads ✅
- Backend health check works ✅
- Watchlist management works ✅
- Real-time data: Limited (pre-market data only)

### Market Hours (9:30 AM - 4:00 PM ET)

- **Full functionality** ✅
- Real-time price updates
- Strategy detection
- Setup notifications
- Discord alerts

### After Hours (4:00 PM - 8:00 PM ET)

- Frontend loads ✅
- Backend health check works ✅
- Real-time data: Limited (after-hours data only)

### Market Closed (8:00 PM - 4:00 AM ET)

- Frontend loads ✅
- Backend health check works ✅
- No real-time data (market closed)
- Historical data still available

---

## 🔧 Developer Tools

### Test Backend API Directly

```bash
# Health check
curl https://fancy-trader.up.railway.app/health

# Get market status
curl https://fancy-trader.up.railway.app/api/market/status

# Get snapshot for SPY
curl https://fancy-trader.up.railway.app/api/market/snapshot/SPY
```

### Monitor WebSocket Connection

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "WS" (WebSocket)
4. Look for connection to `wss://fancy-trader.up.railway.app/ws`
5. Click on the connection to see messages

---

## 📝 Testing Checklist

- [ ] Backend health check returns 200 OK
- [ ] Frontend loads without errors
- [ ] Connection status shows green badge
- [ ] Watchlist manager works (add/remove symbols)
- [ ] Settings save and persist
- [ ] Trade cards appear during market hours
- [ ] Trade details modal opens and displays data
- [ ] WebSocket connection stays stable
- [ ] Discord alerts work (if configured)
- [ ] Mobile responsive design works
- [ ] No console errors

---

## 🎯 What's Next?

Once testing is complete:

1. **Monitor Performance:**

   - Railway dashboard → View metrics
   - Check memory/CPU usage
   - Monitor request counts

2. **Set Up Alerts:**

   - Railway can alert you if the backend goes down
   - Set up uptime monitoring (e.g., UptimeRobot)

3. **Customize for Your Needs:**

   - Add more symbols to watchlist
   - Adjust strategy parameters
   - Configure Discord alerts
   - Add custom indicators

4. **Scale If Needed:**
   - Railway auto-scales based on usage
   - Monitor logs for performance issues
   - Upgrade Railway plan if needed

---

## 🚀 You're Live!

Your Fancy Trader app is now:

- ✅ **Deployed** to production
- ✅ **Connected** to Polygon API for real-time data
- ✅ **Integrated** with Supabase for data persistence
- ✅ **Ready** to detect setups during market hours
- ✅ **Accessible** from anywhere via the web

**Happy Trading! 📈**
