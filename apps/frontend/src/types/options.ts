import type {
  OptionsContract,
  AlertType,
  TradeAlert,
  TradeState,
  PositionTracking,
} from "@/types/trade";

export type {
  OptionsContract,
  AlertType,
  TradeAlert,
  TradeState,
  PositionTracking,
} from "@/types/trade";

// Enhanced Trade Type with Options Data
export interface TradeWithOptions {
  tradeState: TradeState;
  optionsContract?: OptionsContract;
  position?: PositionTracking;
  alertHistory: TradeAlert[];
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
    defaultMessage:
      "🔔 LOAD ALERT\n\nSymbol: {symbol}\nContract: {contract}\nStrike: ${strike}\nPremium: ${premium}\nExpiration: {expiration}\n\nSetup: {setup}\nConviction: {conviction}\n\nWaiting for entry signal...",
  },
  ENTRY: {
    type: "ENTRY",
    defaultMessage:
      "✅ ENTRY ALERT\n\n{symbol} {contract}\nEntered: ${premium}\n\nTarget: ${target}\nStop: ${stop}\n\nLet's ride! 🚀",
  },
  TRIM_25: {
    type: "TRIM_25",
    defaultMessage:
      "📊 TRIM 25%\n\n{symbol} trimming 25% at ${premium}\nProfit: {profit}%\n\nLocking in gains, letting rest run.",
  },
  TRIM_50: {
    type: "TRIM_50",
    defaultMessage:
      "📊 TRIM 50%\n\n{symbol} trimming 50% at ${premium}\nProfit: {profit}%\n\nSecured half, riding rest.",
  },
  ADD: {
    type: "ADD",
    defaultMessage:
      "➕ ADDING TO POSITION\n\n{symbol} adding more at ${premium}\n\nAveraging in on confirmation.",
  },
  STOP_ADJUST: {
    type: "STOP_ADJUST",
    defaultMessage: "🛡️ STOP ADJUSTED\n\n{symbol} moving stop to ${newStop}\n\nProtecting profits.",
    requiresInput: true,
    inputLabel: "New Stop Price",
  },
  TARGET_HIT: {
    type: "TARGET_HIT",
    defaultMessage:
      "🎯 TARGET HIT\n\n{symbol} hit target at ${premium}\nProfit: {profit}%\n\nNice trade! 💰",
  },
  EXIT_ALL: {
    type: "EXIT_ALL",
    defaultMessage:
      "🚪 FULL EXIT\n\n{symbol} closed position at ${premium}\nFinal P&L: {profit}%\n\nOn to the next one!",
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
  const unrealizedPL = premiumDiff * position.positionSize * 100;
  const totalPL = position.realizedPL + unrealizedPL;
  const totalPLPercent =
    ((position.currentPremium - position.entryPremium) / position.entryPremium) * 100;

  return {
    ...position,
    unrealizedPL,
    totalPL,
    totalPLPercent,
  };
}
