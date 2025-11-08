import type { TradeStatus } from "../trading";

export interface WatchlistItem {
  symbol: string;
}

export interface Snapshot {
  symbol: string;
  price: number;
  time: number;
}

export interface TradeLite {
  id: string;
  symbol: string;
  entryPrice: number;
  stop: number;
  target: number;
  status: TradeStatus;
}
