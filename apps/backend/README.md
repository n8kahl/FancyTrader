# Fancy Trader Backend (Massive-first)

Real-time trading setup detection backend with **Massive.com** integration (primary), WebSocket streaming, and Discord alerts. Polygon support is **optional** and disabled by default behind `FEATURE_POLYGON_ENABLED=false`.

## Features

- ✅ **Real-time Market Data Streaming** - Massive WS + REST with retries/backoff/circuit
- ✅ **Automated Setup Detection** - Detects KCU LTP strategies (ORB+PC, EMA Bounce, VWAP, Cloud, etc.)
- ✅ **Technical Indicators** - EMA, SMA, RSI, VWAP, ATR calculations
- ✅ **Confluence Analysis** - Multi-factor confluence scoring for high-probability setups
- ✅ **Discord Alerts** - Automated notifications for setup detections and trade events
- ✅ **Options Data** - Full options chain, contracts, and Greeks
- ✅ **Data Persistence** - Supabase integration for watchlists and setup history
- ✅ **RESTful API** - Complete REST API for market data, setups, and watchlists
- ✅ **WebSocket Broadcasting** - Real-time updates pushed to all connected clients

## Architecture

```
Frontend (React) <--> WebSocket <--> Backend <--> Polygon.io API
                 <--> REST API  <-->         <--> Supabase DB
                                              <--> Discord Webhooks
```

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:

- `POLYGON_API_KEY` - Your Polygon.io/Massive.com API key
- `DISCORD_WEBHOOK_URL` - Discord webhook URL for alerts
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key

### 3. Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:8080`

### 4. Build for Production

```bash
npm run build
npm start
```

## Deployment to Railway

### Option 1: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set POLYGON_API_KEY=your_key_here
railway variables set DISCORD_WEBHOOK_URL=your_webhook_url
railway variables set SUPABASE_URL=your_supabase_url
railway variables set SUPABASE_SERVICE_KEY=your_service_key

# Deploy
railway up
```

### Option 2: GitHub Integration

1. Push this code to GitHub
2. Go to [Railway Dashboard](https://railway.app/)
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables in Settings
6. Deploy!

Railway will automatically:

- Detect Node.js and install dependencies
- Run `npm run build`
- Start the server with `npm start`

## API Endpoints

### Health Check

```
GET /health
```

### Setups

```
GET /api/setups              # Get all active setups
GET /api/setups/:symbol      # Get setups for symbol
GET /api/setups/history/:userId  # Get setup history
DELETE /api/setups/:setupId  # Delete a setup
```

### Market Data

```
GET /api/market/snapshot/:symbol           # Current snapshot
GET /api/market/bars/:symbol               # Historical bars
  Query params: multiplier, timespan, from, to, limit
GET /api/market/previous-close/:symbol     # Previous close
GET /api/market/status                     # Market status
```

### Options

```
GET /api/options/contracts/:underlying     # Get contracts
  Query params: expiration, type, strike
GET /api/options/snapshot/:underlying/:optionSymbol  # Options snapshot
GET /api/options/chain/:underlying         # Full options chain
  Query params: expiration (required)
```

### Watchlist

```
GET /api/watchlist/:userId                 # Get watchlist
POST /api/watchlist/:userId                # Save watchlist
PUT /api/watchlist/:userId/add             # Add symbols
DELETE /api/watchlist/:userId/remove/:symbol  # Remove symbol
```

## WebSocket Protocol

### Connect

```
ws://localhost:8080/ws
```

### Client → Server Messages

**Subscribe to symbols:**

```json
{
  "type": "SUBSCRIBE",
  "payload": {
    "symbols": ["AAPL", "TSLA", "SPY"]
  }
}
```

**Unsubscribe:**

```json
{
  "type": "UNSUBSCRIBE",
  "payload": {
    "symbols": ["AAPL"]
  }
}
```

**Ping:**

```json
{
  "type": "PING"
}
```

### Server → Client Messages

**Setup detected:**

```json
{
  "type": "SETUP_UPDATE",
  "payload": {
    "action": "new",
    "setup": {
      "id": "AAPL-123",
      "symbol": "AAPL",
      "setupType": "ORB_PC",
      "direction": "LONG",
      "entryPrice": 150.00,
      "stopLoss": 148.50,
      "targets": [151.50, 153.00],
      "confluenceScore": 5,
      "confluenceFactors": [...]
    }
  },
  "timestamp": 1234567890
}
```

**Price update:**

```json
{
  "type": "PRICE_UPDATE",
  "payload": {
    "symbol": "AAPL",
    "price": 150.25,
    "timestamp": 1234567890
  }
}
```

## Strategy Detection

The backend automatically detects the following setups:

1. **ORB + Patient Candle** - Opening range breakout with consolidation
2. **EMA Bounce** - Bounces off EMA21 in trend
3. **VWAP Strategy** - Price crossing VWAP with momentum
4. **Cloud Strategy** - EMA9/21 cloud breakouts
5. **Fibonacci Pullback** - Pullbacks to key Fib levels
6. **Breakout** - High-volume breakouts from consolidation

Each setup includes:

- Entry price, stop loss, and multiple targets
- Confluence factors (EMA alignment, RSI, VWAP, volume, etc.)
- Patient candle identification
- Real-time status updates

## Discord Alerts

Automatic Discord notifications for:

- 🔔 Setup detected
- 🚀 Entry confirmation
- 🎯 Target hit
- 🛑 Stop loss hit
- 💰 Partial exit
- 🏁 Position closed

Configure your Discord webhook in `.env`:

```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_ENABLED=true
```

## Technical Indicators

Calculated on multiple timeframes (1m, 5m, 60m):

- EMA (9, 21, 50)
- SMA (200)
- RSI (14)
- VWAP
- ATR (14)

## Environment Variables Reference

| Variable               | Required | Description                          |
| ---------------------- | -------- | ------------------------------------ |
| `PORT`                 | No       | Server port (default: 8080)          |
| `NODE_ENV`             | No       | Environment (development/production) |
| `POLYGON_API_KEY`      | Yes      | Polygon.io API key                   |
| `POLYGON_WS_URL`       | No       | Polygon WebSocket URL                |
| `DISCORD_WEBHOOK_URL`  | Yes      | Discord webhook for alerts           |
| `DISCORD_ENABLED`      | No       | Enable Discord alerts (true/false)   |
| `SUPABASE_URL`         | Yes      | Supabase project URL                 |
| `SUPABASE_SERVICE_KEY` | Yes      | Supabase service role key            |
| `FRONTEND_URL`         | No       | Frontend URL for CORS                |

## Project Structure

```
backend/
├── src/
│   ├── index.ts                    # Main server entry
│   ├── types/                      # TypeScript type definitions
│   │   └── index.ts
│   ├── services/
│   │   ├── polygonClient.ts        # REST API client
│   │   ├── polygonStreamingService.ts  # WebSocket streaming
│   │   ├── strategyDetector.ts     # Setup detection engine
│   │   ├── technicalIndicators.ts  # Indicator calculations
│   │   ├── discordService.ts       # Discord alerts
│   │   └── supabaseService.ts      # Database operations
│   ├── routes/
│   │   ├── index.ts                # Route setup
│   │   ├── setups.ts               # Setup endpoints
│   │   ├── watchlist.ts            # Watchlist endpoints
│   │   ├── marketData.ts           # Market data endpoints
│   │   └── options.ts              # Options endpoints
│   ├── websocket/
│   │   └── handler.ts              # WebSocket handler
│   └── utils/
│       └── logger.ts               # Logging utility
├── package.json
├── tsconfig.json
└── .env.example
```

## Troubleshooting

### Polygon Connection Issues

If WebSocket connection fails:

1. Verify API key is correct
2. Check Polygon.io service status
3. Ensure you have streaming permissions on your plan

### Discord Alerts Not Sending

1. Verify webhook URL is correct
2. Check `DISCORD_ENABLED=true` in `.env`
3. Look for error messages in logs

### Database Connection Issues

1. Verify Supabase URL and service key
2. Ensure `kv_store_c59dbecd` table exists
3. Check Supabase project is active

> See **`docs/AUTHORITATIVE_PLAN.md`** for the source-of-truth roadmap and decisions.

## Support

For issues with:

- Polygon.io API: https://polygon.io/docs
- Railway deployment: https://docs.railway.app
- Supabase: https://supabase.com/docs

## License

MIT
