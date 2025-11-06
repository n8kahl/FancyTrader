# Fancy Trader - Frontend

Real-time KCU LTP Setup Monitor and Discord Alerts System with full backend integration.

## Features

- ✅ Real-time market data streaming via WebSocket
- ✅ Automated setup detection (ORB+PC, EMA Bounce, VWAP, Cloud, Fibonacci, Breakout)
- ✅ Live confluence analysis with 10+ factors
- ✅ Options trading workflow with P&L tracking
- ✅ Discord alert system
- ✅ Responsive design (mobile & desktop)
- ✅ Dark/Light mode
- ✅ Patient Candle visualization
- ✅ Comprehensive strategy library (22 strategies)

## Backend Integration

This frontend connects to the Fancy Trader backend for:
- Real-time setup detection via Polygon.io
- WebSocket streaming of market data
- Options chain data with full Greeks
- Persistent watchlist and settings via Supabase
- Automated Discord alerts

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Backend URL

Update `/config/backend.ts` with your backend URL:

```typescript
// For local development
const LOCAL_HTTP_URL = 'http://localhost:8080';
const LOCAL_WS_URL = 'ws://localhost:8080/ws';

// For production (after deploying backend to Railway)
const PRODUCTION_HTTP_URL = 'https://your-app.railway.app';
const PRODUCTION_WS_URL = 'wss://your-app.railway.app/ws';
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Connecting to Backend

The frontend automatically connects to the backend on startup using the `useBackendConnection` hook.

### Using Real Backend Data

```typescript
import { useBackendConnection } from './hooks/useBackendConnection';

function App() {
  const { 
    isConnected, 
    trades, 
    subscribeToSymbols,
    refreshSetups 
  } = useBackendConnection();

  // Subscribe to watchlist symbols
  useEffect(() => {
    if (isConnected) {
      subscribeToSymbols(['AAPL', 'TSLA', 'SPY']);
    }
  }, [isConnected]);

  return <div>...</div>;
}
```

### Using Mock Data (Fallback)

If the backend is unavailable, the app automatically falls back to mock data. To disable backend connection:

```typescript
const { trades } = useBackendConnection(false); // Pass false to disable auto-connect
```

## Project Structure

```
├── components/          # React components
│   ├── ui/             # Shadcn UI components
│   └── ...             # Trade cards, modals, charts, etc.
├── config/             # Configuration
│   ├── backend.ts      # Backend URLs and endpoints
│   ├── strategies.ts   # Strategy definitions
│   └── watchlist.ts    # Watchlist configuration
├── hooks/              # React hooks
│   └── useBackendConnection.ts  # Backend integration hook
├── services/           # Services
│   ├── apiClient.ts    # REST API client
│   └── websocketClient.ts  # WebSocket client
├── types/              # TypeScript types
├── utils/              # Utilities
│   └── logger.ts       # Logging utility
└── App.tsx             # Main application
```

## API Client Usage

```typescript
import { apiClient } from './services/apiClient';

// Get all setups
const setups = await apiClient.getSetups();

// Get market snapshot
const snapshot = await apiClient.getSnapshot('AAPL');

// Get options chain
const chain = await apiClient.getOptionsChain('SPY', '2024-12-20');

// Get watchlist
const watchlist = await apiClient.getWatchlist('user123');
```

## WebSocket Client Usage

```typescript
import { wsClient } from './services/websocketClient';

// Connect
wsClient.connect();

// Subscribe to symbols
wsClient.subscribe(['AAPL', 'TSLA', 'SPY']);

// Listen for messages
wsClient.onMessage((message) => {
  console.log('Received:', message);
});

// Unsubscribe
wsClient.unsubscribe(['AAPL']);

// Disconnect
wsClient.disconnect();
```

## Environment Variables

Create a `.env` file for production configuration:

```env
VITE_BACKEND_URL=https://your-app.railway.app
VITE_BACKEND_WS_URL=wss://your-app.railway.app/ws
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Netlify

1. Build: `npm run build`
2. Publish directory: `dist`
3. Add environment variables
4. Deploy!

## Features Documentation

- [Complete Strategy Library](./docs/Complete-Strategy-Library.md)
- [Options Trading System](./docs/Options-Trading-System.md)
- [Watchlist Management](./docs/Watchlist-Management.md)
- [Patient Candle Visualizer](./docs/Patient-Candle-Visualizer.md)
- [LTP Strategy Guide](./docs/LTP-Strategy-Guide.md)

## Troubleshooting

### Backend Connection Failed

If you see "Backend Connection Failed" toast:

1. Ensure backend is running
2. Check backend URL in `/config/backend.ts`
3. Verify CORS is enabled on backend
4. Check browser console for errors

### WebSocket Not Connecting

1. Verify WebSocket URL (use `wss://` for HTTPS)
2. Check firewall/proxy settings
3. Ensure backend WebSocket server is running
4. Check browser console for connection errors

### Mock Data Instead of Real Data

The app uses mock data when:
- Backend is unavailable
- Health check fails
- WebSocket connection fails

This is intentional fallback behavior. Fix backend connection to use real data.

## Development Mode vs Production

**Development (npm run dev):**
- Connects to `localhost:8080`
- Verbose logging enabled
- Hot module replacement

**Production (npm run build):**
- Connects to Railway backend
- Minimal logging
- Optimized bundle

## License

MIT
