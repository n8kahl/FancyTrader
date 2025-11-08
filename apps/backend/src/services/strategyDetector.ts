import { EventEmitter } from "events";
import type {
  StrategyParams,
  ConfidenceBreakdown,
  ConfluenceScore,
  ConfluenceKey,
} from "@fancytrader/shared";
import {
  Bar,
  Trade,
  Quote,
  DetectedSetup,
  ConfluenceFactor,
  TechnicalIndicators,
} from "../types";
import {
  calculateAllIndicators,
  isBullishEMAAlignment,
  isBearishEMAAlignment,
  isRSIOversold,
  isRSIOverbought,
  isPatientCandle,
} from "./technicalIndicators";
import { logger } from "../utils/logger";
import { defaultStrategyParams, defaultConfluenceWeights } from "../config/strategy.defaults";

interface SymbolData {
  symbol: string;
  bars1m: Bar[];
  bars5m: Bar[];
  bars60m: Bar[];
  latestQuote?: Quote;
  latestTrade?: Trade;
  indicators1m?: TechnicalIndicators;
  indicators5m?: TechnicalIndicators;
  indicators60m?: TechnicalIndicators;
  currentSetups: Map<string, DetectedSetup>;
}

export class StrategyDetectorService extends EventEmitter {
  private symbolDataMap = new Map<string, SymbolData>();
  private setupIdCounter = 0;
  private params: StrategyParams;

  constructor(params: StrategyParams = defaultStrategyParams) {
    super();
    this.params = params;
  }

  updateParams(params: StrategyParams): void {
    this.params = params;
  }

  /**
   * Process incoming bar data
   */
  processBar(bar: Bar): void {
    const symbolData = this.getOrCreateSymbolData(bar.symbol);

    // Add to appropriate timeframe
    // Note: In production, you'd determine timeframe from bar.timestamp intervals
    symbolData.bars1m.push(bar);

    // Keep only last 500 bars for memory efficiency
    if (symbolData.bars1m.length > 500) {
      symbolData.bars1m.shift();
    }

    // Aggregate to 5m and 60m timeframes
    this.aggregateTimeframes(symbolData);

    // Calculate indicators
    this.calculateIndicators(symbolData);

    // Detect setups
    this.detectSetups(symbolData);
  }

  /**
   * Process incoming trade data
   */
  processTrade(trade: Trade): void {
    const symbolData = this.getOrCreateSymbolData(trade.symbol);
    symbolData.latestTrade = trade;

    // Update existing setups with new price
    this.updateSetups(symbolData, trade.price);
  }

  /**
   * Process incoming quote data
   */
  processQuote(quote: Quote): void {
    const symbolData = this.getOrCreateSymbolData(quote.symbol);
    symbolData.latestQuote = quote;
  }

  /**
   * Get or create symbol data container
   */
  private getOrCreateSymbolData(symbol: string): SymbolData {
    if (!this.symbolDataMap.has(symbol)) {
      this.symbolDataMap.set(symbol, {
        symbol,
        bars1m: [],
        bars5m: [],
        bars60m: [],
        currentSetups: new Map(),
      });
    }
    return this.symbolDataMap.get(symbol)!;
  }

  /**
   * Aggregate 1m bars to 5m and 60m
   */
  private aggregateTimeframes(data: SymbolData): void {
    // Aggregate to 5m
    if (data.bars1m.length >= 5) {
      const last5 = data.bars1m.slice(-5);
      const bar5m: Bar = {
        symbol: data.symbol,
        timestamp: last5[0].timestamp,
        open: last5[0].open,
        high: Math.max(...last5.map((b) => b.high)),
        low: Math.min(...last5.map((b) => b.low)),
        close: last5[last5.length - 1].close,
        volume: last5.reduce((sum, b) => sum + b.volume, 0),
        vwap: this.calculateGroupVWAP(last5),
      };

      data.bars5m.push(bar5m);
      if (data.bars5m.length > 200) data.bars5m.shift();
    }

    // Aggregate to 60m
    if (data.bars1m.length >= 60) {
      const last60 = data.bars1m.slice(-60);
      const bar60m: Bar = {
        symbol: data.symbol,
        timestamp: last60[0].timestamp,
        open: last60[0].open,
        high: Math.max(...last60.map((b) => b.high)),
        low: Math.min(...last60.map((b) => b.low)),
        close: last60[last60.length - 1].close,
        volume: last60.reduce((sum, b) => sum + b.volume, 0),
        vwap: this.calculateGroupVWAP(last60),
      };

      data.bars60m.push(bar60m);
      if (data.bars60m.length > 100) data.bars60m.shift();
    }
  }

  /**
   * Calculate VWAP for a group of bars
   */
  private calculateGroupVWAP(bars: Bar[]): number {
    let sumPriceVolume = 0;
    let sumVolume = 0;

    bars.forEach((bar) => {
      const typical = (bar.high + bar.low + bar.close) / 3;
      sumPriceVolume += typical * bar.volume;
      sumVolume += bar.volume;
    });

    return sumVolume > 0 ? sumPriceVolume / sumVolume : 0;
  }

  /**
   * Calculate technical indicators for all timeframes
   */
  private calculateIndicators(data: SymbolData): void {
    if (data.bars1m.length >= 200) {
      data.indicators1m = calculateAllIndicators(data.bars1m);
    }
    if (data.bars5m.length >= 50) {
      data.indicators5m = calculateAllIndicators(data.bars5m);
    }
    if (data.bars60m.length >= 50) {
      data.indicators60m = calculateAllIndicators(data.bars60m);
    }
  }

  /**
   * Detect trading setups
   */
  private detectSetups(data: SymbolData): void {
    if (!data.indicators5m || data.bars5m.length < 20) return;

    const currentBar = data.bars5m[data.bars5m.length - 1];
    const previousBars = data.bars5m.slice(-20, -1);

    if (!this.passesVolumeGuard(currentBar)) {
      return;
    }

    // Detect ORB + Patient Candle
    this.detectORBSetup(data, currentBar, previousBars);

    // Detect EMA Bounce
    this.detectEMABounce(data, currentBar, previousBars);

    // Detect VWAP Strategy
    this.detectVWAPStrategy(data, currentBar);

    // Detect Cloud Strategy
    this.detectCloudStrategy(data, currentBar);

    // Detect Fibonacci Pullback
    this.detectFibonacciPullback(data, currentBar, previousBars);

    // Detect Breakout
    this.detectBreakout(data, currentBar, previousBars);
  }

  /**
   * Detect Opening Range Breakout with Patient Candle
   */
  private detectORBSetup(data: SymbolData, currentBar: Bar, previousBars: Bar[]): void {
    if (!data.indicators5m) return;

    const marketOpen = this.getMarketOpenTime(currentBar.timestamp);
    const now = new Date(currentBar.timestamp);
    const minutesSinceOpen = (now.getTime() - marketOpen.getTime()) / (1000 * 60);

    // ORB is typically first 5-15 minutes
    if (minutesSinceOpen < 5 || minutesSinceOpen > 60) return;

    const orbBars = previousBars.filter((bar) => {
      const barTime = new Date(bar.timestamp);
      const barMinutes = (barTime.getTime() - marketOpen.getTime()) / (1000 * 60);
      return barMinutes >= 0 && barMinutes <= 15;
    });

    if (orbBars.length < 3) return;

    const orbHigh = Math.max(...orbBars.map((b) => b.high));
    const orbLow = Math.min(...orbBars.map((b) => b.low));

    const isPatient = isPatientCandle(currentBar, data.indicators5m.atr || 0);

    // Check for breakout above ORB high
    if (currentBar.close > orbHigh && isPatient) {
      const { factors: longFactors, confidence: longConfidence } = this.calculateConfluence(
        data,
        "LONG",
        currentBar,
        previousBars
      );

      if (longFactors.length >= 3) {
        this.createSetup(data, {
          setupType: "ORB_PC",
          direction: "LONG",
          entryPrice: orbHigh,
          stopLoss: orbLow,
          targets: [orbHigh + (orbHigh - orbLow), orbHigh + (orbHigh - orbLow) * 2],
          confluenceFactors: longFactors,
          confidence: longConfidence,
          patientCandle: currentBar,
        });
      }
    }

    // Check for breakdown below ORB low
    if (currentBar.close < orbLow && isPatient) {
      const { factors: shortFactors, confidence: shortConfidence } = this.calculateConfluence(
        data,
        "SHORT",
        currentBar,
        previousBars
      );

      if (shortFactors.length >= 3) {
        this.createSetup(data, {
          setupType: "ORB_PC",
          direction: "SHORT",
          entryPrice: orbLow,
          stopLoss: orbHigh,
          targets: [orbLow - (orbHigh - orbLow), orbLow - (orbHigh - orbLow) * 2],
          confluenceFactors: shortFactors,
          confidence: shortConfidence,
          patientCandle: currentBar,
        });
      }
    }
  }

  /**
   * Detect EMA Bounce Setup
   */
  private detectEMABounce(data: SymbolData, currentBar: Bar, previousBars: Bar[]): void {
    if (!data.indicators5m || !data.indicators60m) return;

    const { ema9, ema21 } = data.indicators5m;
    if (!ema9 || !ema21) return;

    const prevBar = previousBars[previousBars.length - 1];
    if (!prevBar) return;

    // Bullish bounce off EMA21
    if (
      prevBar.low <= ema21 * 1.005 &&
      currentBar.close > ema21 &&
      isBullishEMAAlignment(data.indicators60m)
    ) {
      const { factors: longFactors, confidence: longConfidence } = this.calculateConfluence(
        data,
        "LONG",
        currentBar,
        previousBars
      );

      if (longFactors.length >= 2) {
        this.createSetup(data, {
          setupType: "EMA_BOUNCE",
          direction: "LONG",
          entryPrice: currentBar.close,
          stopLoss: ema21 * 0.98,
          targets: [currentBar.close * 1.02, currentBar.close * 1.04],
          confluenceFactors: longFactors,
          confidence: longConfidence,
          patientCandle: isPatientCandle(currentBar, data.indicators5m.atr || 0)
            ? currentBar
            : undefined,
        });
      }
    }

    // Bearish rejection from EMA21
    if (
      prevBar.high >= ema21 * 0.995 &&
      currentBar.close < ema21 &&
      isBearishEMAAlignment(data.indicators60m)
    ) {
      const { factors: shortFactors, confidence: shortConfidence } = this.calculateConfluence(
        data,
        "SHORT",
        currentBar,
        previousBars
      );

      if (shortFactors.length >= 2) {
        this.createSetup(data, {
          setupType: "EMA_BOUNCE",
          direction: "SHORT",
          entryPrice: currentBar.close,
          stopLoss: ema21 * 1.02,
          targets: [currentBar.close * 0.98, currentBar.close * 0.96],
          confluenceFactors: shortFactors,
          confidence: shortConfidence,
          patientCandle: isPatientCandle(currentBar, data.indicators5m.atr || 0)
            ? currentBar
            : undefined,
        });
      }
    }
  }

  /**
   * Detect VWAP Strategy
   */
  private detectVWAPStrategy(data: SymbolData, currentBar: Bar): void {
    if (!data.indicators5m?.vwap) return;

    const vwap = data.indicators5m.vwap;
    const price = currentBar.close;

    // Price crossing above VWAP
    if (price > vwap && Math.abs(price - vwap) / vwap < 0.003) {
      const { factors: longFactors, confidence: longConfidence } = this.calculateConfluence(data, "LONG", currentBar);

      if (longFactors.length >= 2) {
        this.createSetup(data, {
          setupType: "VWAP_STRATEGY",
          direction: "LONG",
          entryPrice: price,
          stopLoss: vwap * 0.995,
          targets: [price * 1.015, price * 1.03],
          confluenceFactors: longFactors,
          confidence: longConfidence,
        });
      }
    }

    // Price crossing below VWAP
    if (price < vwap && Math.abs(price - vwap) / vwap < 0.003) {
      const { factors: shortFactors, confidence: shortConfidence } = this.calculateConfluence(data, "SHORT", currentBar);

      if (shortFactors.length >= 2) {
        this.createSetup(data, {
          setupType: "VWAP_STRATEGY",
          direction: "SHORT",
          entryPrice: price,
          stopLoss: vwap * 1.005,
          targets: [price * 0.985, price * 0.97],
          confluenceFactors: shortFactors,
          confidence: shortConfidence,
        });
      }
    }
  }

  /**
   * Detect Cloud Strategy (EMA9/21 cloud)
   */
  private detectCloudStrategy(data: SymbolData, currentBar: Bar): void {
    if (!data.indicators5m) return;

    const { ema9, ema21 } = data.indicators5m;
    if (!ema9 || !ema21) return;

    const cloudThickness = Math.abs(ema9 - ema21);
    const price = currentBar.close;

    // Bullish setup: Price above cloud
    if (price > Math.max(ema9, ema21) && ema9 > ema21) {
      const { factors: longFactors, confidence: longConfidence } = this.calculateConfluence(data, "LONG", currentBar);

      if (longFactors.length >= 3) {
        this.createSetup(data, {
          setupType: "CLOUD_STRATEGY",
          direction: "LONG",
          entryPrice: price,
          stopLoss: ema21,
          targets: [price + cloudThickness, price + cloudThickness * 2],
          confluenceFactors: longFactors,
          confidence: longConfidence,
        });
      }
    }

    // Bearish setup: Price below cloud
    if (price < Math.min(ema9, ema21) && ema9 < ema21) {
      const { factors: shortFactors, confidence: shortConfidence } = this.calculateConfluence(data, "SHORT", currentBar);

      if (shortFactors.length >= 3) {
        this.createSetup(data, {
          setupType: "CLOUD_STRATEGY",
          direction: "SHORT",
          entryPrice: price,
          stopLoss: ema21,
          targets: [price - cloudThickness, price - cloudThickness * 2],
          confluenceFactors: shortFactors,
          confidence: shortConfidence,
        });
      }
    }
  }

  /**
   * Detect Fibonacci Pullback
   */
  private detectFibonacciPullback(data: SymbolData, currentBar: Bar, previousBars: Bar[]): void {
    if (previousBars.length < 10) return;

    const recentBars = previousBars.slice(-10);
    const swingHigh = Math.max(...recentBars.map((b) => b.high));
    const swingLow = Math.min(...recentBars.map((b) => b.low));
    const range = swingHigh - swingLow;

    // Fibonacci levels
    const fib500 = swingHigh - range * 0.5;
    const fib618 = swingHigh - range * 0.618;

    const price = currentBar.close;

    // Bullish: Price near fib retracement in uptrend
    if (Math.abs(price - fib618) / price < 0.005 || Math.abs(price - fib500) / price < 0.005) {
      const { factors: longFactors, confidence: longConfidence } = this.calculateConfluence(
        data,
        "LONG",
        currentBar,
        previousBars
      );

      if (longFactors.length >= 2) {
        this.createSetup(data, {
          setupType: "FIBONACCI_PULLBACK",
          direction: "LONG",
          entryPrice: price,
          stopLoss: swingLow,
          targets: [swingHigh, swingHigh + range * 0.618],
          confluenceFactors: longFactors,
          confidence: longConfidence,
        });
      }
    }
  }

  /**
   * Detect Breakout
   */
  private detectBreakout(data: SymbolData, currentBar: Bar, previousBars: Bar[]): void {
    if (previousBars.length < 20) return;

    const consolidationBars = previousBars.slice(-20);
    const high20 = Math.max(...consolidationBars.map((b) => b.high));
    const low20 = Math.min(...consolidationBars.map((b) => b.low));

    // Breakout above resistance
    if (
      currentBar.close > high20 &&
      currentBar.volume > data.bars5m.slice(-10).reduce((sum, b) => sum + b.volume, 0) / 10
    ) {
      const { factors: longFactors, confidence: longConfidence } = this.calculateConfluence(
        data,
        "LONG",
        currentBar,
        previousBars
      );

      if (longFactors.length >= 2) {
        this.createSetup(data, {
          setupType: "BREAKOUT",
          direction: "LONG",
          entryPrice: currentBar.close,
          stopLoss: high20 * 0.98,
          targets: [currentBar.close * 1.02, currentBar.close * 1.05],
          confluenceFactors: longFactors,
          confidence: longConfidence,
        });
      }
    }

    // Breakdown below support
    if (
      currentBar.close < low20 &&
      currentBar.volume > data.bars5m.slice(-10).reduce((sum, b) => sum + b.volume, 0) / 10
    ) {
      const { factors: shortFactors, confidence: shortConfidence } = this.calculateConfluence(
        data,
        "SHORT",
        currentBar,
        previousBars
      );

      if (shortFactors.length >= 2) {
        this.createSetup(data, {
          setupType: "BREAKOUT",
          direction: "SHORT",
          entryPrice: currentBar.close,
          stopLoss: low20 * 1.02,
          targets: [currentBar.close * 0.98, currentBar.close * 0.95],
          confluenceFactors: shortFactors,
          confidence: shortConfidence,
        });
      }
    }
  }

  /**
   * Calculate confluence factors and confidence
   */
  private calculateConfluence(
    data: SymbolData,
    direction: "LONG" | "SHORT",
    currentBar: Bar,
    previousBars: Bar[] = []
  ): { factors: ConfluenceFactor[]; confidence: ConfidenceBreakdown } {
    const baseScores: ConfluenceScore[] = defaultConfluenceWeights.map(({ key, weight }) => ({
      key,
      weight,
      present: false,
    }));

    if (!data.indicators5m || !data.indicators60m) {
      return { factors: [], confidence: { total: 0, factors: baseScores } };
    }

    const factors: ConfluenceFactor[] = [];
    const mark = (key: ConfluenceKey, present: boolean, factor?: ConfluenceFactor): void => {
      const score = baseScores.find((item) => item.key === key);
      if (score) {
        score.present = present;
      }
      if (present && factor) {
        factors.push(factor);
      }
    };

    const ind5m = data.indicators5m;
    const ind60m = data.indicators60m;

    const bullish = direction === "LONG";
    const emaAlignment = bullish ? isBullishEMAAlignment(ind60m) : isBearishEMAAlignment(ind60m);
    mark("emaTrendAlign", emaAlignment, {
      factor: bullish ? "Bullish EMA Alignment" : "Bearish EMA Alignment",
      present: emaAlignment,
      value: emaAlignment ? "TF EMA stack" : undefined,
    });

    const higherAgree = this.higherTimeframeAgreement(data, direction);
    mark("higherTimeframeAgree", higherAgree, {
      factor: "Higher TF Trend",
      present: higherAgree,
      value: higherAgree ? direction : undefined,
    });

    if (ind5m.rsi14) {
      const rsi = ind5m.rsi14;
      const rsiSignal = bullish ? isRSIOversold(rsi, 35) : isRSIOverbought(rsi, 65);
      mark("rsiDivergence", rsiSignal, {
        factor: bullish ? "RSI Oversold" : "RSI Overbought",
        present: rsiSignal,
        value: rsi.toFixed(1),
      });
    }

    if (previousBars.length) {
      const previousExtremes = bullish
        ? Math.max(...previousBars.map((bar) => bar.high))
        : Math.min(...previousBars.map((bar) => bar.low));
      const breakoutRetest = bullish
        ? currentBar.low <= previousExtremes && currentBar.close >= previousExtremes
        : currentBar.high >= previousExtremes && currentBar.close <= previousExtremes;
      mark("breakoutRetest", breakoutRetest, {
        factor: bullish ? "Breakout Retest" : "Breakdown Retest",
        present: breakoutRetest,
        value: previousExtremes.toFixed(2),
      });
    }

    if (ind5m.vwap) {
      const reclaimed = bullish ? currentBar.close > ind5m.vwap : currentBar.close < ind5m.vwap;
      mark("vwapReclaim", reclaimed, {
        factor: bullish ? "VWAP Reclaim" : "VWAP Rejection",
        present: reclaimed,
        value: ind5m.vwap.toFixed(2),
      });
    }

    const total = baseScores.reduce((sum, score) => (score.present ? sum + score.weight : sum), 0);
    const confidence: ConfidenceBreakdown = {
      total: Math.min(100, total),
      factors: baseScores,
    };

    return { factors, confidence };
  }

  private higherTimeframeAgreement(data: SymbolData, direction: "LONG" | "SHORT"): boolean {
    const primaryWindow = this.params.mtf[0];
    const series = this.getSeriesForTf(data, primaryWindow.tf);
    if (series.length <= primaryWindow.length) {
      return false;
    }
    const latest = series[series.length - 1].close;
    const lookback = series[series.length - primaryWindow.length - 1].close;
    const slope = latest - lookback;
    if (direction === "LONG") {
      return slope >= (this.params.minTrendSlope ?? 0);
    }
    return slope <= -(this.params.minTrendSlope ?? 0);
  }

  private getSeriesForTf(data: SymbolData, tf: "1m" | "5m" | "15m" | "1h" | "1d"): Bar[] {
    switch (tf) {
      case "1m":
        return data.bars1m;
      case "5m":
        return data.bars5m;
      case "15m":
        return data.bars5m;
      case "1h":
      case "1d":
      default:
        return data.bars60m;
    }
  }

  /**
   * Create a new setup
   */
  private createSetup(
    data: SymbolData,
    partial: Partial<DetectedSetup> & { confidence?: ConfidenceBreakdown }
  ): void {
    const setupId = `${data.symbol}-${++this.setupIdCounter}`;
    const now = Date.now();
    const direction = partial.direction!;
    const entryPrice = partial.entryPrice;
    const derivedStop = this.deriveStopLoss(entryPrice, direction, data.indicators5m);
    const stopLoss = partial.stopLoss ?? derivedStop;
    const targets = partial.targets ?? this.deriveTargets(entryPrice, stopLoss, direction);
    const confluenceScore = (partial.confidence?.total ?? partial.confluenceFactors?.length) ?? 0;

    const setup: DetectedSetup = {
      id: setupId,
      symbol: data.symbol,
      setupType: partial.setupType!,
      status: "SETUP_FORMING",
      direction,
      timeframe: "5m",
      entryPrice,
      stopLoss,
      targets,
      confluenceScore,
      confluenceFactors: partial.confluenceFactors || [],
      patientCandle: partial.patientCandle,
      indicators: data.indicators5m!,
      confidence: partial.confidence,
      timestamp: now,
      lastUpdate: now,
    };

    data.currentSetups.set(setupId, setup);

    // Emit event for WebSocket broadcast
    this.emit("setup-detected", setup);

    logger.info(`New setup detected: ${setup.symbol} ${setup.setupType} ${setup.direction}`);
  }

  /**
   * Update existing setups with new price
   */
  private updateSetups(data: SymbolData, currentPrice: number): void {
    data.currentSetups.forEach((setup, id) => {
      const updated = { ...setup, lastUpdate: Date.now() };

      // Check if targets hit
      if (setup.targets && setup.entryPrice) {
        const direction = setup.direction === "LONG" ? 1 : -1;

        setup.targets.forEach((target, i) => {
          if (direction === 1 && currentPrice >= target) {
            updated.status = "ACTIVE";
            this.emit("target-hit", { setup: updated, targetIndex: i, price: currentPrice });
          } else if (direction === -1 && currentPrice <= target) {
            updated.status = "ACTIVE";
            this.emit("target-hit", { setup: updated, targetIndex: i, price: currentPrice });
          }
        });
      }

      // Check if stop loss hit
      if (setup.stopLoss) {
        const direction = setup.direction === "LONG" ? 1 : -1;

        if (
          (direction === 1 && currentPrice <= setup.stopLoss) ||
          (direction === -1 && currentPrice >= setup.stopLoss)
        ) {
          updated.status = "CLOSED";
          this.emit("stop-loss-hit", { setup: updated, price: currentPrice });
        }
      }

      data.currentSetups.set(id, updated);
    });
  }

  private passesVolumeGuard(bar: Bar): boolean {
    if (!this.params.minVolume) {
      return true;
    }
    return bar.volume >= this.params.minVolume;
  }

  private directionMultiplier(direction: "LONG" | "SHORT"): number {
    return direction === "LONG" ? 1 : -1;
  }

  private deriveStopLoss(entryPrice: number | undefined, direction: "LONG" | "SHORT", indicators?: TechnicalIndicators): number | undefined {
    if (!entryPrice || !indicators?.atr) {
      return undefined;
    }
    const offset = indicators.atr * this.params.atrMultStop;
    return direction === "LONG" ? entryPrice - offset : entryPrice + offset;
  }

  private deriveTargets(entryPrice: number | undefined, stopLoss: number | undefined, direction: "LONG" | "SHORT"): number[] | undefined {
    if (!entryPrice || !stopLoss) {
      return undefined;
    }
    const risk = Math.abs(entryPrice - stopLoss);
    if (risk === 0) {
      return undefined;
    }
    const multiplier = this.directionMultiplier(direction);
    return this.params.rTargets.map((target: number) =>
      Number((entryPrice + multiplier * risk * target).toFixed(2))
    );
  }

  /**
   * Get market open time for a given timestamp
   */
  private getMarketOpenTime(timestamp: number): Date {
    const date = new Date(timestamp);
    date.setHours(9, 30, 0, 0); // Market opens at 9:30 AM ET
    return date;
  }

  getParams(): StrategyParams {
    return this.params;
  }

  /**
   * Get all active setups
   */
  getActiveSetups(): DetectedSetup[] {
    const allSetups: DetectedSetup[] = [];

    this.symbolDataMap.forEach((data) => {
      data.currentSetups.forEach((setup) => {
        if (setup.status !== "CLOSED" && setup.status !== "DISMISSED") {
          allSetups.push(setup);
        }
      });
    });

    return allSetups;
  }

  /**
   * Get setups for a specific symbol
   */
  getSetupsForSymbol(symbol: string): DetectedSetup[] {
    const data = this.symbolDataMap.get(symbol);
    return data ? Array.from(data.currentSetups.values()) : [];
  }
}
