# Options Trading System

## Overview
The KCU Admin System now includes a complete options contract workflow for managing trades from setup through exit, with real-time P&L tracking and Discord alert integration.

## Trade Lifecycle States

### 1. SETUP
- Initial state when a trade is identified
- No options contract loaded yet
- Shows "Load Contract" button on trade card

### 2. LOADED
- Options contract selected and loaded
- Contract details and quantity set
- Alert sent to Discord
- Shows contract info and "Manage Trade" button

### 3. ENTERED
- Position entered at specific premium
- Entry alert sent with full trade details
- P&L tracking begins
- Shows live P&L on card

### 4. ACTIVE
- Trade actively managed
- Can trim (25%, 50%), add contracts, adjust stops
- Real-time P&L updates every 3 seconds
- Full alert history displayed

### 5. CLOSED
- All contracts exited
- Final P&L locked
- Complete trade history preserved

## Demo Trade

**SPY (ID: 15)** - Active Options Position

- **Contract:** $452C 12/06
- **Entry:** $2.45 (10 contracts)
- **Current:** $3.85 (5 contracts remaining)
- **P&L:** +$1,575 (+64.3%)
- **Alerts:**
  1. LOAD - Contract loaded at $2.45
  2. ENTRY - Entered 10 contracts
  3. TRIM_50 - Trimmed 5 contracts at $3.65, locked +$875

## Features

### TradeCard Display
- Shows options contract details when loaded
- Live P&L with color-coded gains/losses
- Entry, current, and invested amounts
- Contract count tracking
- Dynamic button: "Load Contract" → "Manage Trade"

### OptionsContractSelector
- ITM, ATM, OTM tabs
- Contract details: strike, premium, delta, break-even
- Expiration date selection (weekly/monthly)
- Quantity input
- Visual indicators for best contracts

### TradeProgressManager
- Live position overview with P&L
- Quick action buttons:
  - Trim 25% / 50%
  - Add contracts
  - Adjust stop
  - Exit all
- Editable Discord alert messages
- Full alert history timeline
- Contract and position details

### TradeDetailsModal
- Enhanced with options section
- Shows contract specifications
- P&L breakdown (realized vs unrealized)
- Scrollable alert history with timestamps
- Entry/current/invested tracking

## Real-Time Updates

- Premium prices update every 3 seconds (simulated ±2% movement)
- P&L automatically recalculated
- Position value dynamically tracked
- Unrealized P&L updates live

## Alert Types

1. **LOAD** - Contract selected and loaded
2. **ENTRY** - Position entered
3. **TRIM_25** - Trim 25% of position
4. **TRIM_50** - Trim 50% of position
5. **ADD** - Add more contracts
6. **STOP_ADJUST** - Move stop loss
7. **TARGET_HIT** - Target reached
8. **EXIT_ALL** - Close entire position
9. **CUSTOM** - Custom message

## Usage Workflow

### Loading a Contract
1. Click "Load Contract" on a SETUP trade
2. Select contract from ITM/ATM/OTM tabs
3. Choose quantity
4. Click "Load Contract"
5. Alert sent to Discord

### Managing Active Trade
1. Click "Manage Trade" on active position
2. View live P&L and position details
3. Send alerts:
   - Trim positions to lock profits
   - Add contracts on confirmation
   - Adjust stops to protect gains
   - Exit when complete
4. Edit alert messages before sending
5. Track full history

### Viewing Trade Details
1. Click "Details" button
2. See options contract specifications
3. Review P&L breakdown
4. Browse alert history
5. Analyze confluence and setup

## Technical Details

### Types (`/types/options.ts`)
- `TradeState` - Lifecycle states
- `OptionsContract` - Contract specifications
- `PositionTracking` - Live position data
- `TradeAlert` - Alert history items
- `AlertType` - Alert categories

### Components
- `OptionsContractSelector.tsx` - Contract selection UI
- `TradeProgressManager.tsx` - Active trade management
- `TradeCard.tsx` - Enhanced with options display
- `TradeDetailsModal.tsx` - Enhanced with options section

### State Management
- Real-time price simulation
- Automatic P&L recalculation
- Position tracking with realized/unrealized
- Alert history persistence
- Contract lifecycle management

## Future Enhancements

- Integration with real options pricing API
- Greeks tracking (theta, vega, gamma)
- IV rank/percentile display
- Multi-leg strategies (spreads, straddles)
- Position size calculator
- Risk/reward visualization
- Profit target levels
- Trade journal export
