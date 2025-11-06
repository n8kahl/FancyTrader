import { Bar, TechnicalIndicators } from '../types';

/**
 * Calculate Exponential Moving Average
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
  return sum / period;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50; // Neutral default

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const gains = changes.slice(-period).map(c => c > 0 ? c : 0);
  const losses = changes.slice(-period).map(c => c < 0 ? Math.abs(c) : 0);

  const avgGain = gains.reduce((sum, g) => sum + g, 0) / period;
  const avgLoss = losses.reduce((sum, l) => sum + l, 0) / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
}

/**
 * Calculate ATR (Average True Range)
 */
export function calculateATR(bars: Bar[], period: number = 14): number {
  if (bars.length < period + 1) return 0;

  const trueRanges: number[] = [];
  
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );

    trueRanges.push(tr);
  }

  return calculateSMA(trueRanges, period);
}

/**
 * Calculate VWAP (Volume Weighted Average Price)
 */
export function calculateVWAP(bars: Bar[]): number {
  if (bars.length === 0) return 0;

  // For intraday VWAP, we'd normally reset at market open
  // For simplicity, calculating over all provided bars
  const typicalPrices = bars.map(bar => (bar.high + bar.low + bar.close) / 3);
  
  let sumPriceVolume = 0;
  let sumVolume = 0;

  bars.forEach((bar, i) => {
    sumPriceVolume += typicalPrices[i] * bar.volume;
    sumVolume += bar.volume;
  });

  return sumVolume > 0 ? sumPriceVolume / sumVolume : 0;
}

/**
 * Calculate all technical indicators for a set of bars
 */
export function calculateAllIndicators(bars: Bar[]): TechnicalIndicators {
  const closes = bars.map(b => b.close);
  
  return {
    ema9: calculateEMA(closes, 9),
    ema21: calculateEMA(closes, 21),
    ema50: calculateEMA(closes, 50),
    sma200: calculateSMA(closes, 200),
    rsi14: calculateRSI(closes, 14),
    vwap: calculateVWAP(bars),
    atr: calculateATR(bars, 14)
  };
}

/**
 * Detect if price is in a bullish EMA alignment
 */
export function isBullishEMAAlignment(indicators: TechnicalIndicators): boolean {
  const { ema9, ema21, ema50 } = indicators;
  
  if (!ema9 || !ema21 || !ema50) return false;
  
  return ema9 > ema21 && ema21 > ema50;
}

/**
 * Detect if price is in a bearish EMA alignment
 */
export function isBearishEMAAlignment(indicators: TechnicalIndicators): boolean {
  const { ema9, ema21, ema50 } = indicators;
  
  if (!ema9 || !ema21 || !ema50) return false;
  
  return ema9 < ema21 && ema21 < ema50;
}

/**
 * Check if RSI is oversold
 */
export function isRSIOversold(rsi: number, threshold: number = 30): boolean {
  return rsi < threshold;
}

/**
 * Check if RSI is overbought
 */
export function isRSIOverbought(rsi: number, threshold: number = 70): boolean {
  return rsi > threshold;
}

/**
 * Calculate support and resistance levels using pivot points
 */
export function calculatePivotPoints(bar: Bar): {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
} {
  const pivot = (bar.high + bar.low + bar.close) / 3;
  
  return {
    pivot,
    r1: 2 * pivot - bar.low,
    r2: pivot + (bar.high - bar.low),
    r3: bar.high + 2 * (pivot - bar.low),
    s1: 2 * pivot - bar.high,
    s2: pivot - (bar.high - bar.low),
    s3: bar.low - 2 * (bar.high - pivot)
  };
}

/**
 * Detect if a candle is a Patient Candle (consolidation)
 */
export function isPatientCandle(bar: Bar, atr: number, threshold: number = 0.5): boolean {
  const candleRange = bar.high - bar.low;
  return candleRange < (atr * threshold);
}
