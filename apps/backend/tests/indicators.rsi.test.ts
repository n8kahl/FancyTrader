import { describe, expect, it } from "@jest/globals";
import type { Bar, TechnicalIndicators } from "../src/types";
import {
  calculateAllIndicators,
  calculateEMA,
  calculateRSI,
  isBullishEMAAlignment,
  isBearishEMAAlignment,
  isRSIOverbought,
  isRSIOversold,
} from "../src/services/technicalIndicators";

const closingSeries = [
  403.4, 404.1, 405.25, 406.9, 404.5, 403.8, 402.6, 401.3,
  400.8, 399.4, 398.7, 399.5, 400.1, 401.2, 402.8, 403.5,
  404.9, 406.2, 407.8, 408.4, 409.1, 407.5, 406.3, 405.1,
  404.6, 403.2, 402.4, 401.7, 400.5, 399.9, 399.2, 398.4,
];

const sampleBars: Bar[] = closingSeries.map((close, idx) => ({
  symbol: "TEST",
  timestamp: idx + 1,
  open: close - 0.5,
  high: close + 1.25,
  low: close - 1.5,
  close,
  volume: 100000 + idx * 250,
}));

describe("technicalIndicators", () => {
  it("calculates EMA/RSI using deterministic data", () => {
    const emaNine = calculateEMA(closingSeries, 9);
    const rsi14 = calculateRSI(closingSeries, 14);

    expect(emaNine).toBeCloseTo(401.2494, 3);
    expect(rsi14).toBeCloseTo(21.3235, 3);
  });

  it("returns boundary RSI values when the series is one-sided", () => {
    const rising = Array.from({ length: 20 }, (_, i) => 100 + i);
    const falling = Array.from({ length: 20 }, (_, i) => 200 - i);

    expect(calculateRSI(rising, 14)).toBe(100);
    expect(calculateRSI(falling, 14)).toBe(0);
  });

  it("derives composite indicator payload and EMA alignment flags", () => {
    const indicators = calculateAllIndicators(sampleBars);

    expect(indicators.ema9).toBeCloseTo(401.2494, 3);
    expect(indicators.ema21).toBeCloseTo(402.3962, 3);
    expect(indicators.vwap).toBeCloseTo(403.1299, 3);
    expect(indicators.atr).toBeCloseTo(2.7928, 3);
    expect(indicators.rsi14).toBeCloseTo(21.3235, 3);
    expect(indicators.sma200).toBeCloseTo(398.4, 3);

    expect(isBullishEMAAlignment(indicators)).toBe(false);
    expect(isBearishEMAAlignment(indicators)).toBe(false);
  });

  it("evaluates EMA alignment helpers", () => {
    const bullish: TechnicalIndicators = { ema9: 410, ema21: 405, ema50: 390 };
    const bearish: TechnicalIndicators = { ema9: 395, ema21: 400, ema50: 420 };

    expect(isBullishEMAAlignment(bullish)).toBe(true);
    expect(isBearishEMAAlignment(bearish)).toBe(true);
  });

  it("flags RSI threshold helpers", () => {
    expect(isRSIOversold(25)).toBe(true);
    expect(isRSIOversold(35)).toBe(false);
    expect(isRSIOverbought(85)).toBe(true);
    expect(isRSIOverbought(55)).toBe(false);
  });
});
