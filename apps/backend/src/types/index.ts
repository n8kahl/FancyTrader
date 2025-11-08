import type { ConfidenceBreakdown } from "@fancytrader/shared";
import type { PolygonServiceState } from "../services/polygonStreamingService";

// Market Data Types
export interface Bar {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface Quote {
  symbol: string;
  timestamp: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
}

export interface Trade {
  symbol: string;
  timestamp: number;
  price: number;
  size: number;
}

// Technical Indicator Types
export interface TechnicalIndicators {
  ema9?: number;
  ema21?: number;
  ema50?: number;
  sma200?: number;
  rsi14?: number;
  vwap?: number;
  atr?: number;
}

// Setup Detection Types
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

export type SetupStatus =
  | "SETUP_FORMING"
  | "SETUP_READY"
  | "MONITORING"
  | "ACTIVE"
  | "PARTIAL_EXIT"
  | "CLOSED"
  | "DISMISSED";

export interface ConfluenceFactor {
  factor: string;
  present: boolean;
  value?: number | string;
  description?: string;
}

export interface DetectedSetup {
  id: string;
  symbol: string;
  setupType: SetupType;
  status: SetupStatus;
  direction: "LONG" | "SHORT";
  timeframe: string;
  entryPrice?: number;
  stopLoss?: number;
  targets?: number[];
  confluenceScore: number;
  confluenceFactors: ConfluenceFactor[];
  patientCandle?: Bar;
  indicators: TechnicalIndicators;
  confidence?: ConfidenceBreakdown;
  timestamp: number;
  lastUpdate: number;
}

// Options Types
export interface OptionsContract {
  symbol: string;
  underlying: string;
  strike: number;
  type: "CALL" | "PUT";
  expiration: string;
  expirationDisplay: string;
  premium: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  timestamp: number;
}

// Discord Alert Types
export type AlertType =
  | "SETUP_ALERT"
  | "ENTRY_ALERT"
  | "TARGET_HIT"
  | "STOP_LOSS"
  | "PARTIAL_EXIT"
  | "CLOSE_POSITION"
  | "CUSTOM";

export interface DiscordAlert {
  type: AlertType;
  symbol: string;
  message: string;
  setup?: DetectedSetup;
  contract?: OptionsContract;
  profitLoss?: number;
  profitLossPercent?: number;
  timestamp: number;
}

// WebSocket Message Types
export type WSMessageType =
  | "SUBSCRIBE"
  | "UNSUBSCRIBE"
  | "SETUP_UPDATE"
  | "PRICE_UPDATE"
  | "OPTIONS_UPDATE"
  | "ERROR"
  | "PING"
  | "PONG"
  | "SERVICE_STATE";

export type WSMessagePayload =
  | { status?: string; message?: string; symbols?: string[] }
  | { error: string; code?: string }
  | { setups?: DetectedSetup[]; action?: string; [key: string]: unknown }
  | PolygonServiceState
  | Record<string, unknown>;

export interface WSMessage {
  type: WSMessageType;
  payload?: WSMessagePayload;
  timestamp?: number;
}

// Watchlist Types
export interface WatchlistSymbol {
  symbol: string;
  name?: string;
  sector?: string;
  enabled: boolean;
  addedAt: number;
}

// Strategy Configuration
export interface StrategyConfig {
  id: string;
  name: string;
  enabled: boolean;
  category: string;
  timeframes: string[];
  minConfluence: number;
}
