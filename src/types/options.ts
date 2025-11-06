// Options Contract Types
export interface OptionsContract {
  symbol: string; // e.g., "SPY"
  strike: number; // e.g., 450
  type: "CALL" | "PUT";
  expiration: string; // ISO date string
  expirationDisplay: string; // e.g., "Dec 15"
  daysToExpiry: number;
  premium: number; // Cost per contract
  delta: number; // 0-1 for calls, -1-0 for puts
  breakEven: number; // Strike + premium for calls
  isITM: boolean; // In the money
  distanceFromPrice: number; // Percentage
  projectedProfit?: number; // If stock hits target
  projectedProfitPercent?: number;
}

// Alert Types for Different Trade Actions
export type AlertType = 
  | "LOAD"          // Initial contract selection
  | "ENTRY"         // Entered position
  | "TRIM_25"       // Trimmed 25% of position
  | "TRIM_50"       // Trimmed 50% of position
  | "ADD"           // Added to position
  | "STOP_ADJUST"   // Adjusted stop loss
  | "TARGET_HIT"    // Target reached
  | "EXIT_ALL"      // Closed entire position
  | "CUSTOM";       // Custom message

// Trade Alert History Entry
export interface TradeAlert {
  id: string;
  type: AlertType;
  message: string;
  timestamp: string;
  contractPrice?: number; // Price at time of alert
  profitLoss?: number; // P&L for this action
  profitLossPercent?: number;
}

// Trade State for Options Flow
export type TradeState = 
  | "SETUP"         // Initial setup detected
  | "LOADED"        // Contract loaded, ready to enter
  | "ENTERED"       // Position entered
  | "ACTIVE"        // Managing active position
  | "CLOSED";       // Position fully closed

// Position Tracking (Premium-based, no contract quantities)
export interface PositionTracking {
  entryPremium: number; // Entry price per contract
  currentPremium: number; // Current market price per contract
  realizedPL: number; // Profit/loss from trims (in dollars)
  unrealizedPL: number; // Current P&L on remaining position
  totalPL: number; // realized + unrealized
  totalPLPercent: number; // Overall P&L percentage
  positionSize: number; // 1.0 = full, 0.5 = half trimmed, 0.25 = 75% trimmed, 0 = closed
}

// Enhanced Trade Type with Options Data
export interface TradeWithOptions {
  // Core trade data
  tradeState: TradeState;
  optionsContract?: OptionsContract;
  position?: PositionTracking;
  alertHistory: TradeAlert[];
  
  // Original entry/target/stop are for stock
  // These are for the actual options entry
  optionsEntry?: number;
  optionsTarget?: number;
  optionsStop?: number;
}

// Alert Template
export interface AlertTemplate {
  type: AlertType;
  defaultMessage: string;
  requiresInput?: boolean;
  inputLabel?: string;
}

export const ALERT_TEMPLATES: Record<AlertType, AlertTemplate> = {
  LOAD: {
    type: "LOAD",
    defaultMessage: "🔔 LOAD ALERT\n\nSymbol: {symbol}\nContract: {contract}\nStrike: ${strike}\nPremium: ${premium}\nExpiration: {expiration}\n\nSetup: {setup}\nConviction: {conviction}\n\nWaiting for entry signal...",
  },
  ENTRY: {
    type: "ENTRY",
    defaultMessage: "✅ ENTRY ALERT\n\n{symbol} {contract}\nEntered: ${premium}\n\nTarget: ${target}\nStop: ${stop}\n\nLet's ride! 🚀",
  },
  TRIM_25: {
    type: "TRIM_25",
    defaultMessage: "📊 TRIM 25%\n\n{symbol} trimming 25% at ${premium}\nProfit: {profit}%\n\nLocking in gains, letting rest run.",
  },
  TRIM_50: {
    type: "TRIM_50",
    defaultMessage: "📊 TRIM 50%\n\n{symbol} trimming 50% at ${premium}\nProfit: {profit}%\n\nSecured half, riding rest.",
  },
  ADD: {
    type: "ADD",
    defaultMessage: "➕ ADDING TO POSITION\n\n{symbol} adding more at ${premium}\n\nAveraging in on confirmation.",
  },
  STOP_ADJUST: {
    type: "STOP_ADJUST",
    defaultMessage: "🛡️ STOP ADJUSTED\n\n{symbol} moving stop to ${newStop}\n\nProtecting profits.",
    requiresInput: true,
    inputLabel: "New Stop Price",
  },
  TARGET_HIT: {
    type: "TARGET_HIT",
    defaultMessage: "🎯 TARGET HIT\n\n{symbol} hit target at ${premium}\nProfit: {profit}%\n\nNice trade! 💰",
  },
  EXIT_ALL: {
    type: "EXIT_ALL",
    defaultMessage: "🚪 FULL EXIT\n\n{symbol} closed position at ${premium}\nFinal P&L: {profit}%\n\nOn to the next one!",
  },
  CUSTOM: {
    type: "CUSTOM",
    defaultMessage: "",
    requiresInput: true,
    inputLabel: "Custom Message",
  },
};

// Helper to generate contract display name
export function getContractDisplay(contract: OptionsContract): string {
  return `$${contract.strike}${contract.type === "CALL" ? "C" : "P"} ${contract.expirationDisplay}`;
}

// Helper to calculate position P&L
export function calculatePositionPL(position: PositionTracking): PositionTracking {
  const premiumDiff = position.currentPremium - position.entryPremium;
  const unrealizedPL = (premiumDiff * position.positionSize * 100); // Per contract P&L * position size
  const totalPL = position.realizedPL + unrealizedPL;
  const totalPLPercent = ((position.currentPremium - position.entryPremium) / position.entryPremium) * 100;

  return {
    ...position,
    unrealizedPL,
    totalPL,
    totalPLPercent,
  };
}
