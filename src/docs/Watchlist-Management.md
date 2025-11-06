# Watchlist Management - Documentation

## Overview

The **Watchlist Manager** allows admins to dynamically add/remove symbols being monitored for LTP setups. Only **active symbols** in the watchlist will be scanned and displayed in the main view.

---

## Key Features

### ✅ Add/Remove Symbols
- Manually add symbols with name and sector
- Remove symbols no longer needed
- Quick-add from popular symbol lists

### ✅ Enable/Disable Monitoring
- Toggle symbols active/inactive without removing
- Only active symbols are scanned
- Gray eye icon indicates inactive symbols

### ✅ Search & Sort
- Search by symbol, name, or sector
- Sort by: Symbol (A-Z), Sector, or Recent
- Filter watchlist instantly

### ✅ Categorized Quick-Add
- Mega Cap (AAPL, MSFT, GOOGL, etc.)
- Tech, Finance, Healthcare
- ETFs (SPY, QQQ, IWM, etc.)
- Crypto (COIN, MSTR, RIOT)
- Energy, Meme/Retail stocks

### ✅ Sector Organization
- 15 predefined sectors
- Easy categorization
- Filter and group by sector

---

## How to Access

### From Main View
Click the **Watchlist icon** (📋+) in the top navigation bar

### From Keyboard
- Future: Keyboard shortcut `Cmd/Ctrl + W`

---

## User Interface

### Stats Bar
```
┌─────────────────────────────���───────┐
│ Active Symbols: 12                  │
│ Total Symbols: 15                   │
│                    [A-Z] [Sector] [Recent]
└─────────────────────────────────────┘
```

### Add Symbol Form
```
┌──────────────────────────────────────────────┐
│ Add New Symbol                               │
│ ┌─────────┬────────────┬────────┬─────────┐ │
│ │ Symbol  │ Name       │ Sector │  [Add]  │ │
│ │ (AAPL)  │ (Optional) │ (Tech) │         │ │
│ └─────────┴────────────┴────────┴─────────┘ │
└──────────────────────────────────────────────┘
```

### Two Tabs

#### 1. My Watchlist Tab
Shows all added symbols with:
- Symbol (e.g., AAPL)
- Full name (e.g., Apple Inc.)
- Sector badge
- Eye icon (active/inactive toggle)
- Delete button

#### 2. Quick Add Tab
Pre-categorized popular symbols:
- **Mega Cap**: AAPL, MSFT, GOOGL, AMZN, META, TSLA, NVDA
- **Tech**: AAPL, MSFT, GOOGL, META, NVDA, AMD, INTC, CRM, ORCL, ADBE
- **Finance**: JPM, BAC, WFC, GS, MS, C, BLK, SCHW
- **Healthcare**: JNJ, UNH, PFE, ABBV, TMO, MRK, ABT, DHR
- **ETFs**: SPY, QQQ, IWM, DIA, VOO, VTI, EEM, GLD, TLT
- **Crypto**: COIN, MSTR, RIOT, MARA, SQ
- **Energy**: XOM, CVX, COP, SLB, EOG, MPC
- **Meme/Retail**: GME, AMC, BBBY, PLTR, SOFI

---

## Workflow

### Adding a New Symbol (Manual)

1. **Enter Symbol** (required)
   - Type in ticker symbol (e.g., "AAPL")
   - Automatically converts to uppercase

2. **Enter Name** (optional)
   - Full company/fund name
   - If blank, uses symbol as name

3. **Select Sector** (optional)
   - Choose from 15 predefined sectors
   - Defaults to "Other"

4. **Click Add**
   - Symbol added to watchlist
   - Automatically set to active
   - Appears in main view immediately

### Adding Symbols (Quick Add)

1. **Switch to "Quick Add" tab**
2. **Browse by category** (Mega Cap, Tech, Finance, etc.)
3. **Click symbol button**
   - Instantly added to watchlist
   - Button shows checkmark if already added
   - Disabled if already in watchlist

### Removing a Symbol

1. **Find symbol** in "My Watchlist" tab
2. **Click trash icon** (🗑️) on the right
3. **Symbol removed** from watchlist
4. **Trades disappear** from main view immediately

### Toggling Active/Inactive

1. **Find symbol** in "My Watchlist" tab
2. **Click eye icon** (👁️) on the right
   - **Green eye** = Active (being monitored)
   - **Gray eye-off** = Inactive (ignored)
3. **Inactive symbols** won't show trades in main view

---

## Search & Sorting

### Search Bar
- Searches across: Symbol, Name, Sector
- Real-time filtering
- Case-insensitive

### Sort Options

#### A-Z (Symbol)
Alphabetical by ticker symbol:
```
AAPL, AMD, AMZN, GOOGL, META, MSFT, NVDA, ...
```

#### Sector
Grouped by sector:
```
Technology:
  AAPL, MSFT, GOOGL, META

Finance:
  JPM, BAC, GS

ETF:
  SPY, QQQ, IWM
```

#### Recent
Most recently added first:
```
IWM (added 5 min ago)
COIN (added 1 hour ago)
AAPL (added 2 days ago)
```

---

## Integration with Main View

### Filtering Logic
```typescript
Only show trades where:
1. Symbol exists in watchlist
2. Symbol isActive = true
3. Matches search query (if any)
4. Matches tab filter (All/High/Active/Warnings)
```

### Header Badge
Shows active symbol count:
```
[📈 12 symbols]
```

### Real-time Updates
- Add symbol → Trades appear immediately
- Remove symbol → Trades disappear immediately
- Toggle inactive → Trades hide/show immediately

---

## Default Watchlist

On first load, includes:
- **Mega Cap Tech** (7): AAPL, MSFT, GOOGL, AMZN, META, TSLA, NVDA
- **Major ETFs** (4): SPY, QQQ, IWM, DIA
- **Popular Stocks** (4): NFLX, AMD, BABA, BA

**Total: 15 symbols** all active by default

---

## Sectors Reference

```typescript
1.  Technology
2.  Finance
3.  Healthcare
4.  Consumer Cyclical
5.  Consumer Defensive
6.  Industrials
7.  Energy
8.  Materials
9.  Real Estate
10. Communication Services
11. Utilities
12. Automotive
13. ETF
14. Crypto
15. Other
```

---

## File Structure

```
/config
  └── watchlist.ts              # Watchlist types & helper functions

/components
  └── WatchlistManager.tsx      # Watchlist management UI

/App.tsx                        # State management & integration
```

---

## State Management

### Watchlist State
```typescript
const [watchlist, setWatchlist] = useState<WatchlistSymbol[]>(DEFAULT_WATCHLIST);

interface WatchlistSymbol {
  symbol: string;        // "AAPL"
  name: string;          // "Apple Inc."
  sector?: string;       // "Technology"
  isActive: boolean;     // true
  addedAt?: string;      // ISO timestamp
}
```

### Active Symbols
```typescript
const activeSymbols = watchlist
  .filter(s => s.isActive)
  .map(s => s.symbol);
// ["AAPL", "MSFT", "GOOGL", ...]
```

### Filtering Trades
```typescript
const filteredTrades = mockTrades.filter(trade => {
  const inWatchlist = activeSymbols.includes(trade.symbol);
  return inWatchlist && matchesSearch && matchesTab;
});
```

---

## Helper Functions

### `addSymbol(symbol, name, sector, watchlist)`
Adds a new symbol to watchlist (if not already present)

### `removeSymbol(symbol, watchlist)`
Removes a symbol from watchlist

### `toggleSymbolActive(symbol, watchlist)`
Toggles isActive status for a symbol

### `isSymbolInWatchlist(symbol, watchlist)`
Checks if symbol already exists

### `getActiveSymbols(watchlist)`
Returns array of active symbol strings

### `sortWatchlist(watchlist, sortBy)`
Sorts by "symbol", "sector", or "recent"

---

## Use Cases

### Day Trader Setup
**Goal**: Monitor only liquid mega caps
```
1. Open Watchlist Manager
2. Click "Mega Cap" in Quick Add
3. Add SPY, QQQ for index context
4. Done - watching 9 symbols
```

### Sector Rotation Strategy
**Goal**: Focus on one sector at a time
```
1. Open Watchlist Manager
2. Disable all symbols (eye icon)
3. Enable only Tech sector symbols
4. Monitor tech setups exclusively
```

### Options Flow Trading
**Goal**: Watch only SPY/QQQ for 0DTE
```
1. Open Watchlist Manager
2. Remove all individual stocks
3. Add SPY, QQQ, IWM
4. Enable "Options Flow" strategies
5. Monitor index options only
```

### Swing Trading Portfolio
**Goal**: Track specific positions
```
1. Add your current holdings manually
2. Set sector for each
3. Monitor for exit signals
4. Remove after closing position
```

---

## Future Enhancements

### Planned Features
- [ ] Import watchlist from CSV/JSON
- [ ] Export watchlist for backup
- [ ] Watchlist presets (save/load configurations)
- [ ] Symbol notes/annotations
- [ ] Performance tracking per symbol
- [ ] Alerts when new symbols added
- [ ] Auto-remove symbols with no setups for X days
- [ ] Integration with broker API (auto-import positions)
- [ ] Sector performance heatmap
- [ ] Symbol correlation matrix

### Advanced Features
- [ ] Custom categories (beyond sectors)
- [ ] Tag-based filtering
- [ ] Bulk operations (enable/disable multiple)
- [ ] Watchlist sharing between admins
- [ ] Real-time price updates in watchlist view
- [ ] Symbol screener integration
- [ ] Unusual options activity detector

---

## Best Practices

### Keep It Focused
✅ **Do**: Monitor 10-20 high-quality symbols  
❌ **Don't**: Add 100+ symbols (information overload)

### Use Sectors
✅ **Do**: Categorize for easy filtering  
❌ **Don't**: Leave everything as "Other"

### Toggle vs. Delete
✅ **Do**: Use inactive toggle for temporary removal  
❌ **Don't**: Delete if you might re-add later

### Regular Cleanup
✅ **Do**: Review watchlist weekly, remove dead symbols  
❌ **Don't**: Let watchlist grow indefinitely

### Quick Add First
✅ **Do**: Use Quick Add for common symbols  
❌ **Don't**: Manually type if it's in Quick Add

---

## Keyboard Shortcuts (Future)

```
Cmd/Ctrl + W     Open Watchlist Manager
Cmd/Ctrl + A     Add New Symbol (focus input)
Cmd/Ctrl + F     Search Watchlist
Escape           Close Watchlist Manager
Enter            Add Symbol (when in input)
Delete           Remove Selected Symbol
Space            Toggle Active/Inactive
```

---

## API Integration (Future)

When connected to real market data:

```typescript
// Real-time watchlist scanning
const scannedSymbols = await scanWatchlist(activeSymbols, strategies);

// Auto-detect setups
scannedSymbols.forEach(symbol => {
  if (hasLTPSetup(symbol)) {
    addTradeToView(symbol);
  }
});

// Update prices in real-time
activeSymbols.forEach(symbol => {
  subscribeToPrice(symbol, updateCallback);
});
```

---

## Error Handling

### Duplicate Symbol
```
⚠️ Symbol already in watchlist
```

### Empty Symbol
```
⚠️ Symbol is required
```

### Invalid Format
```
⚠️ Symbol must be 1-5 uppercase letters
```

---

## Mobile Optimization

- Full-width dialogs on mobile
- Larger touch targets
- Simplified layout for small screens
- Quick Add buttons wrap properly
- Search always accessible

---

*The Watchlist Manager gives admins full control over which symbols are monitored, making the system flexible for different trading styles and market conditions.*
