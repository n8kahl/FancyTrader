import type { BacktestTrade } from "./runner.js";

export interface PnLSummary {
  trades: number;
  wins: number;
  winRate: number;
  avgR: number;
  totalR: number;
  maxDrawdownR: number;
  expectancyR: number;
}

export interface WeeklyBucket {
  weekStart: string;
  count: number;
  winRate: number;
  totalR: number;
}

export function computePnL(trades: BacktestTrade[], feesR = 0): PnLSummary {
  if (trades.length === 0) {
    return {
      trades: 0,
      wins: 0,
      winRate: 0,
      avgR: 0,
      totalR: 0,
      maxDrawdownR: 0,
      expectancyR: 0,
    };
  }

  let wins = 0;
  let totalR = 0;
  let maxDrawdownR = 0;
  let equity = 0;
  let peak = 0;

  trades.forEach((trade) => {
    const resultR = trade.resultR - feesR;
    totalR += resultR;
    equity += resultR;
    peak = Math.max(peak, equity);
    maxDrawdownR = Math.min(maxDrawdownR, equity - peak);
    if (resultR > 0) wins += 1;
  });

  const tradesCount = trades.length;
  const avgR = tradesCount ? totalR / tradesCount : 0;
  const winRate = tradesCount ? wins / tradesCount : 0;
  const expectancyR = winRate * avgGain(trades, wins) - (1 - winRate) * avgLoss(trades, wins);

  return {
    trades: tradesCount,
    wins,
    winRate,
    avgR,
    totalR,
    maxDrawdownR,
    expectancyR: Number.isFinite(expectancyR) ? expectancyR : 0,
  };
}

export function bucketByWeek(trades: BacktestTrade[]): WeeklyBucket[] {
  const bucketMap = new Map<string, { wins: number; totalR: number; count: number }>();

  trades.forEach((trade) => {
    const entry = new Date(trade.entryTime);
    const weekStart = startOfWeek(entry).toISOString().slice(0, 10);
    const bucket = bucketMap.get(weekStart) ?? { wins: 0, totalR: 0, count: 0 };

    if (trade.resultR > 0) bucket.wins += 1;
    bucket.totalR += trade.resultR;
    bucket.count += 1;

    bucketMap.set(weekStart, bucket);
  });

  return Array.from(bucketMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([weekStart, bucket]) => ({
      weekStart,
      count: bucket.count,
      winRate: bucket.count ? bucket.wins / bucket.count : 0,
      totalR: bucket.totalR,
    }));
}

function startOfWeek(date: Date): Date {
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
}

function avgGain(trades: BacktestTrade[], wins: number): number {
  if (wins === 0) return 0;
  const total = trades.filter((t) => t.resultR > 0).reduce((sum, trade) => sum + trade.resultR, 0);
  return total / wins;
}

function avgLoss(trades: BacktestTrade[], wins: number): number {
  const losses = trades.length - wins;
  if (losses === 0) return 0;
  const total = trades.filter((t) => t.resultR <= 0).reduce((sum, trade) => sum + Math.abs(trade.resultR), 0);
  return total / losses;
}
