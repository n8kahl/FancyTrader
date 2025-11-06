# Backend Integration Guide

Complete guide for integrating the Fancy Trader frontend with the backend.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   Components   │  │    Hooks     │  │    Services     │ │
│  │  - TradeCard   │  │ - useBackend │  │  - apiClient    │ │
│  │  - Modals      │  │   Connection │  │  - wsClient     │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP / WebSocket
                         │
┌────────────────────────┴────────────────────────────────────┐
│                    BACKEND (Node.js)                         │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   REST API     │  │  WebSocket   │  │    Services     │ │
│  │  - /api/setups │  │   Handler    │  │  - Polygon      │ │
│  │  - /api/market │  │              │  │  - Strategy     │ │
│  │  - /api/options│  │              │  │  - Discord      │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
                    External APIs
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────┐    ┌─────▼──────┐   ┌────▼─��───┐
   │ Polygon │    │  Supabase  │   │ Discord  │
   │   API   │    │     DB     │   │ Webhooks │
   └─────────┘    └────────────┘   └──────────┘
```

## 📁 Integration Files

### 1. Configuration (`/config/backend.ts`)

Central configuration for backend URLs:

```typescript
export const BACKEND_CONFIG = {
  httpUrl: 'http://localhost:8080',  // Development
  wsUrl: 'ws://localhost:8080/ws',    // Development
  isDevelopment: true,
};
```

**Production:**
- Update URLs to Railway deployment
- Use environment variables for flexibility

### 2. API Client (`/services/apiClient.ts`)

REST API client with methods for:
- `getSetups()` - Fetch active setups
- `getSnapshot(symbol)` - Get market data
- `getOptionsContracts(underlying)` - Options data
- `getWatchlist(userId)` - User watchlist

**Usage:**
```typescript
import { apiClient } from './services/apiClient';

const setups = await apiClient.getSetups();
```

### 3. WebSocket Client (`/services/websocketClient.ts`)

Real-time data streaming:
- Auto-reconnection with exponential backoff
- Message handling and routing
- Symbol subscription management
- Heartbeat/ping-pong

**Usage:**
```typescript
import { wsClient } from './services/websocketClient';

wsClient.connect();
wsClient.subscribe(['AAPL', 'TSLA']);

wsClient.onMessage((message) => {
  // Handle real-time updates
});
```

### 4. Backend Hook (`/hooks/useBackendConnection.ts`)

React hook for managing backend connection:

```typescript
const { 
  isConnected,
  trades,
  subscribeToSymbols,
  refreshSetups 
} = useBackendConnection();
```

**Features:**
- Automatic connection on mount
- Real-time trade updates
- Connection status tracking
- Error handling and fallback

### 5. Connection Status (`/components/ConnectionStatus.tsx`)

UI component showing:
- Connection status indicator
- Backend health check
- Connection diagnostics
- Test runner

## 🔌 Integration Steps

### Step 1: Install Dependencies

No additional dependencies needed - everything uses native `fetch` and `WebSocket`.

### Step 2: Configure Backend URL

Update `/config/backend.ts`:

```typescript
// Local development
const LOCAL_HTTP_URL = 'http://localhost:8080';
const LOCAL_WS_URL = 'ws://localhost:8080/ws';

// Production (after Railway deployment)
const PRODUCTION_HTTP_URL = 'https://your-app.railway.app';
const PRODUCTION_WS_URL = 'wss://your-app.railway.app/ws';
```

### Step 3: Use Backend Hook in App

The App.tsx is already integrated:

```typescript
const { 
  isConnected, 
  trades,
  subscribeToSymbols 
} = useBackendConnection(!useMockData);

// Trades automatically update from backend
```

### Step 4: Subscribe to Watchlist

```typescript
useEffect(() => {
  if (isConnected) {
    const symbols = watchlist.map(w => w.symbol);
    subscribeToSymbols(symbols);
  }
}, [isConnected, watchlist]);
```

### Step 5: Toggle Between Mock and Live Data

Use the "Go Live" / "Mock" button in the UI:
- **Mock Mode**: Uses local generated data
- **Live Mode**: Connects to backend for real data

## 📊 Data Flow

### Setup Detection Flow

1. **Backend** detects setup via Polygon.io stream
2. **Strategy Detector** analyzes confluence factors
3. **WebSocket** broadcasts new setup to all clients
4. **Frontend Hook** receives message
5. **React State** updates with new trade
6. **UI** re-renders with new setup card

### Price Update Flow

1. **Polygon.io** sends real-time price
2. **Backend** processes and forwards
3. **WebSocket** sends to subscribed clients
4. **Frontend** updates trade's currentPrice
5. **P&L** automatically recalculated
6. **UI** shows updated profit/loss

### Options Contract Flow

1. **User** clicks "Load Contract"
2. **Frontend** calls `/api/options/contracts/:underlying`
3. **Backend** fetches from Polygon.io
4. **Frontend** displays contract selector
5. **User** selects contract
6. **Trade** state updated with contract details

## 🔄 Message Types

### Client → Server

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

**Ping (heartbeat):**
```json
{
  "type": "PING"
}
```

### Server → Client

**New setup detected:**
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
    "price": 150.25
  },
  "timestamp": 1234567890
}
```

**Target hit:**
```json
{
  "type": "SETUP_UPDATE",
  "payload": {
    "action": "target_hit",
    "setup": {...},
    "targetIndex": 0,
    "price": 151.50
  }
}
```

**Error:**
```json
{
  "type": "ERROR",
  "payload": {
    "error": "Connection failed"
  }
}
```

## 🧪 Testing Connection

### Option 1: Using Connection Test Utility

```typescript
import { runConnectionTests, logTestResults } from './utils/connectionTest';

const results = await runConnectionTests();
logTestResults(results);
```

This runs 5 tests:
1. Backend reachability
2. Health endpoint
3. WebSocket connection
4. API endpoint
5. Market data endpoint

### Option 2: Using Connection Status Component

Add to your UI:

```tsx
import { ConnectionStatus } from './components/ConnectionStatus';

<ConnectionStatus 
  isConnected={isConnected}
  isLoading={isLoading}
  error={error}
  onRetry={() => window.location.reload()}
/>
```

### Option 3: Manual Testing

**Browser Console:**
```javascript
// Test WebSocket
const ws = new WebSocket('ws://localhost:8080/ws');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (e) => console.log('Message:', e.data);

// Test API
fetch('http://localhost:8080/health')
  .then(r => r.json())
  .then(console.log);
```

## 🐛 Common Issues

### Issue 1: "Backend Connection Failed"

**Cause:** Backend not running or wrong URL

**Solution:**
1. Check backend is running: `cd backend && npm run dev`
2. Verify URL in `/config/backend.ts`
3. Check browser console for errors

### Issue 2: WebSocket Connects But No Data

**Cause:** Not subscribed to any symbols

**Solution:**
```typescript
// Make sure to subscribe
subscribeToSymbols(['AAPL', 'TSLA', 'SPY']);
```

### Issue 3: CORS Errors

**Cause:** Backend CORS not configured for frontend URL

**Solution:**
Backend `.env`:
```env
FRONTEND_URL=http://localhost:5173
```

### Issue 4: WebSocket Connection Refused

**Cause:** Using `ws://` with HTTPS or vice versa

**Solution:**
- Local: `ws://localhost:8080/ws`
- Production: `wss://your-app.railway.app/ws`

### Issue 5: Types Don't Match

**Cause:** Frontend and backend types are out of sync

**Solution:**
Ensure `/backend/src/types/index.ts` matches frontend types in:
- `/types/confluence.ts`
- `/types/options.ts`
- `/components/TradeCard.tsx` (Trade type)

## 🔐 Authentication (Future)

Currently, the system doesn't require authentication. To add:

1. **Backend:** Implement JWT tokens
2. **Frontend:** Store token in localStorage
3. **API Client:** Add Authorization header
4. **WebSocket:** Send token on connect

Example:
```typescript
// apiClient.ts
headers: {
  'Authorization': `Bearer ${token}`
}

// wsClient.ts
ws.send(JSON.stringify({
  type: 'AUTH',
  token: token
}));
```

## 📈 Performance Optimization

### 1. Debounce WebSocket Messages

```typescript
const debouncedUpdate = debounce((trade) => {
  setTrades(prev => updateTrade(prev, trade));
}, 100);
```

### 2. Memoize Filtered Trades

```typescript
const filteredTrades = useMemo(() => {
  return trades.filter(/* ... */);
}, [trades, filters]);
```

### 3. Virtual Scrolling for Large Lists

For 100+ trades, use `react-window`:

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={trades.length}
  itemSize={120}
>
  {({ index, style }) => (
    <div style={style}>
      <TradeCard trade={trades[index]} />
    </div>
  )}
</FixedSizeList>
```

### 4. Lazy Load Components

```typescript
const TradeDetailsModal = lazy(() => 
  import('./components/TradeDetailsModal')
);
```

## 🚀 Production Checklist

- [ ] Update backend URLs in `/config/backend.ts`
- [ ] Set environment variables in Vercel
- [ ] Test health endpoint
- [ ] Test WebSocket connection
- [ ] Verify API calls work
- [ ] Check CORS configuration
- [ ] Test with real market data
- [ ] Verify Discord alerts work
- [ ] Test on mobile devices
- [ ] Monitor error logs
- [ ] Set up error tracking (e.g., Sentry)

## 📚 API Reference

See `/backend/README.md` for complete API documentation.

**Quick Reference:**

```typescript
// Get all setups
GET /api/setups

// Get snapshot
GET /api/market/snapshot/:symbol

// Get options contracts
GET /api/options/contracts/:underlying

// Get watchlist
GET /api/watchlist/:userId

// WebSocket
WS /ws
```

## 🎯 Next Steps

1. **Deploy backend to Railway**
2. **Update frontend config with Railway URL**
3. **Deploy frontend to Vercel**
4. **Test end-to-end**
5. **Monitor for issues**
6. **Iterate and improve**

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Review backend logs
3. Run connection tests
4. Verify environment variables
5. Check API endpoints directly with curl

Happy trading! 🚀
