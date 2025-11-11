import type { Bar } from "../types/index.js";
import type { PolygonClient } from "../services/massiveClient.js";
import type { StrategyParams } from "@fancytrader/shared";
import { defaultStrategyParams } from "../config/strategy.defaults.js";

export interface BacktestConfig {
  symbol: string;
  from: string;
  to: string;
  timespan: "minute" | "hour" | "day";
  limit?: number;
  strategy?: Record<string, unknown>;
  strategyParams?: StrategyParams;
}

export interface BacktestTrade {
  symbol: string;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  resultR: number;
}

export async function fetchAggregates(config: BacktestConfig, client: PolygonClient): Promise<Bar[]> {
  const { symbol, timespan, from, to, limit = 5_000 } = config;
  return client.getAggregates(symbol, 1, timespan, from, to, limit);
}

export function runDetectors(
  bars: Bar[],
  params: StrategyParams = defaultStrategyParams
): BacktestTrade[] {
  if (bars.length < 2) return [];

  const trades: BacktestTrade[] = [];
  for (let i = 1; i < bars.length; i += 1) {
    const prev = bars[i - 1];
    const current = bars[i];
    const entryPrice = prev.close;
    const exitPrice = current.close;
    const baseRisk = Math.max(prev.high - prev.low, 0.01);
    const risk = baseRisk * params.atrMultStop;
    const resultR = (exitPrice - entryPrice) / risk;

    trades.push({
      symbol: current.symbol,
      entryTime: prev.timestamp,
      exitTime: current.timestamp,
      entryPrice,
      exitPrice,
      resultR,
    });
  }

  return trades;
}
