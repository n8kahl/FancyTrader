// Shared trading domain contracts used by both frontend and backend.

import type { ConfidenceBreakdown } from "./contracts/strategy";

export type Direction = "LONG" | "SHORT";

export type TradeStatus =
  | "MONITORING"
  | "SETUP_FORMING"
  | "SETUP_READY"
  | "ACTIVE"
  | "PARTIAL_EXIT"
  | "CLOSED"
  | "DISMISSED"
  | "REENTRY_SETUP"
  | "INVALID";

export type Conviction = "HIGH" | "MEDIUM" | "LOW";
export type DayType = "TREND" | "CHOP" | "UNKNOWN";
export type ConfluenceStrength = "HIGH" | "MEDIUM" | "LOW";

export type TradeState = "SETUP" | "LOADED" | "ENTERED" | "ACTIVE" | "CLOSED";

export type SetupType =
  | "ORB_PC"
  | "EMA_BOUNCE"
  | "VWAP_STRATEGY"
  | "KING_QUEEN"
  | "CLOUD_STRATEGY"
  | "FIBONACCI_PULLBACK"
  | "REVERSAL_SETUP"
  | "MOMENTUM_CONTINUATION"
  | "BREAKOUT"
  | "PULLBACK";

export type AlertType =
  | "LOAD"
  | "ENTRY"
  | "TRIM_25"
  | "TRIM_50"
  | "ADD"
  | "STOP_ADJUST"
  | "TARGET_HIT"
  | "EXIT_ALL"
  | "CUSTOM";

export interface ConfluenceFactor {
  factor: string;
  value: string | number;
  strength: ConfluenceStrength;
  present: boolean;
  description?: string;
}

export interface PatientCandle {
  isContained: boolean;
  pcHigh: number;
  pcLow: number;
  pcOpen: number;
  pcClose: number;
  priorHigh: number;
  priorLow: number;
  priorOpen: number;
  priorClose: number;
  direction: Direction;
}

export interface NoTradeWarnings {
  sma200Headwind?: boolean;
  chopDay?: boolean;
  preVWAPTime?: boolean;
  poorRiskReward?: boolean;
  pcInvalid?: boolean;
  [key: string]: boolean | undefined;
}

export interface PriceCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface OptionsContract {
  symbol: string;
  strike: number;
  type: "CALL" | "PUT";
  expiration: string;
  expirationDisplay: string;
  daysToExpiry: number;
  premium: number;
  delta: number;
  breakEven: number;
  isITM: boolean;
  distanceFromPrice: number;
  projectedProfit?: number;
  projectedProfitPercent?: number;
}

export interface PositionTracking {
  entryPremium: number;
  currentPremium: number;
  realizedPL: number;
  unrealizedPL: number;
  totalPL: number;
  totalPLPercent: number;
  positionSize: number;
}

export interface TradeAlert {
  id: string;
  type: AlertType;
  message: string;
  timestamp: string;
  contractPrice?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  template?: string;
  customMessage?: string;
}

export interface Trade {
  id: string;
  symbol: string;
  setup: string;
  status: TradeStatus;
  tradeState: TradeState;
  alertHistory: TradeAlert[];
  direction?: Direction;
  conviction?: Conviction;
  timeframe?: string;
  dayType?: DayType;
  event?: "FOMC" | "CPI" | "EARNINGS" | null;
  marketPhase?: "PRE_MARKET" | "ORB_FORMING" | "POST_10" | "CLOUD_WINDOW" | "CLOSE" | "UNKNOWN";
  price?: number;
  change?: number;
  changePercent?: number;
  entry?: number;
  target?: number;
  stop?: number;
  riskReward?: string;
  entryPrice?: number;
  currentPrice?: number;
  stopLoss?: number;
  targets?: number[];
  profitLoss?: number;
  profitLossPercent?: number;
  confluenceScore?: number;
  confluenceFactors?: ConfluenceFactor[];
  confluenceDetails?: Record<string, string | number | boolean | undefined>;
  confidence?: ConfidenceBreakdown;
  patientCandle?: PatientCandle;
  priceData?: PriceCandle[];
  warnings?: NoTradeWarnings;
  optionsContract?: OptionsContract;
  position?: PositionTracking;
  indicators?: Record<string, number | string | boolean | undefined>;
  timestamp?: number;
  createdAt?: number;
  updatedAt?: number;
  notes?: string;
  watchlistPriority?: number;
}

export type OptionContract = OptionsContract;
