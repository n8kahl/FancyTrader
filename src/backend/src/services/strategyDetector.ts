import { EventEmitter } from 'events';
import { 
  Bar, 
  Trade, 
  Quote, 
  DetectedSetup, 
  SetupType, 
  SetupStatus,
  ConfluenceFactor,
  TechnicalIndicators 
} from '../types';
import { 
  calculateAllIndicators, 
  isBullishEMAAlignment, 
  isBearishEMAAlignment,
  isRSIOversold,
  isRSIOverbought,
  isPatientCandle,
  calculatePivotPoints
} from './technicalIndicators';
import { logger } from '../utils/logger';

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
  private symbolDataMap: Map<string, SymbolData> = new Map();
  private setupIdCounter = 0;

  constructor() {
    super();
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
        currentSetups: new Map()
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
        high: Math.max(...last5.map(b => b.high)),
        low: Math.min(...last5.map(b => b.low)),
        close: last5[last5.length - 1].close,
        volume: last5.reduce((sum, b) => sum + b.volume, 0),
        vwap: this.calculateGroupVWAP(last5)
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
        high: Math.max(...last60.map(b => b.high)),
        low: Math.min(...last60.map(b => b.low)),
        close: last60[last60.length - 1].close,
        volume: last60.reduce((sum, b) => sum + b.volume, 0),
        vwap: this.calculateGroupVWAP(last60)
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

    bars.forEach(bar => {
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

    const orbBars = previousBars.filter(bar => {
      const barTime = new Date(bar.timestamp);
      const barMinutes = (barTime.getTime() - marketOpen.getTime()) / (1000 * 60);
      return barMinutes >= 0 && barMinutes <= 15;
    });

    if (orbBars.length < 3) return;

    const orbHigh = Math.max(...orbBars.map(b => b.high));
    const orbLow = Math.min(...orbBars.map(b => b.low));

    const isPatient = isPatientCandle(currentBar, data.indicators5m.atr || 0);
    
    // Check for breakout above ORB high
    if (currentBar.close > orbHigh && isPatient) {
      const confluenceFactors = this.calculateConfluence(data, 'LONG', currentBar);
      
      if (confluenceFactors.length >= 3) {
        this.createSetup(data, {
          setupType: 'ORB_PC',
          direction: 'LONG',
          entryPrice: orbHigh,
          stopLoss: orbLow,
          targets: [orbHigh + (orbHigh - orbLow), orbHigh + (orbHigh - orbLow) * 2],
          confluenceFactors,
          patientCandle: currentBar
        });
      }
    }

    // Check for breakdown below ORB low
    if (currentBar.close < orbLow && isPatient) {
      const confluenceFactors = this.calculateConfluence(data, 'SHORT', currentBar);
      
      if (confluenceFactors.length >= 3) {
        this.createSetup(data, {
          setupType: 'ORB_PC',
          direction: 'SHORT',
          entryPrice: orbLow,
          stopLoss: orbHigh,
          targets: [orbLow - (orbHigh - orbLow), orbLow - (orbHigh - orbLow) * 2],
          confluenceFactors,
          patientCandle: currentBar
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
    if (prevBar.low <= ema21 * 1.005 && currentBar.close > ema21 && 
        isBullishEMAAlignment(data.indicators60m)) {
      
      const confluenceFactors = this.calculateConfluence(data, 'LONG', currentBar);
      
      if (confluenceFactors.length >= 2) {
        this.createSetup(data, {
          setupType: 'EMA_BOUNCE',
          direction: 'LONG',
          entryPrice: currentBar.close,
          stopLoss: ema21 * 0.98,
          targets: [currentBar.close * 1.02, currentBar.close * 1.04],
          confluenceFactors,
          patientCandle: isPatientCandle(currentBar, data.indicators5m.atr || 0) ? currentBar : undefined
        });
      }
    }

    // Bearish rejection from EMA21
    if (prevBar.high >= ema21 * 0.995 && currentBar.close < ema21 && 
        isBearishEMAAlignment(data.indicators60m)) {
      
      const confluenceFactors = this.calculateConfluence(data, 'SHORT', currentBar);
      
      if (confluenceFactors.length >= 2) {
        this.createSetup(data, {
          setupType: 'EMA_BOUNCE',
          direction: 'SHORT',
          entryPrice: currentBar.close,
          stopLoss: ema21 * 1.02,
          targets: [currentBar.close * 0.98, currentBar.close * 0.96],
          confluenceFactors,
          patientCandle: isPatientCandle(currentBar, data.indicators5m.atr || 0) ? currentBar : undefined
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
      const confluenceFactors = this.calculateConfluence(data, 'LONG', currentBar);
      
      if (confluenceFactors.length >= 2) {
        this.createSetup(data, {
          setupType: 'VWAP_STRATEGY',
          direction: 'LONG',
          entryPrice: price,
          stopLoss: vwap * 0.995,
          targets: [price * 1.015, price * 1.03],
          confluenceFactors
        });
      }
    }

    // Price crossing below VWAP
    if (price < vwap && Math.abs(price - vwap) / vwap < 0.003) {
      const confluenceFactors = this.calculateConfluence(data, 'SHORT', currentBar);
      
      if (confluenceFactors.length >= 2) {
        this.createSetup(data, {
          setupType: 'VWAP_STRATEGY',
          direction: 'SHORT',
          entryPrice: price,
          stopLoss: vwap * 1.005,
          targets: [price * 0.985, price * 0.97],
          confluenceFactors
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
      const confluenceFactors = this.calculateConfluence(data, 'LONG', currentBar);
      
      if (confluenceFactors.length >= 3) {
        this.createSetup(data, {
          setupType: 'CLOUD_STRATEGY',
          direction: 'LONG',
          entryPrice: price,
          stopLoss: ema21,
          targets: [price + cloudThickness, price + cloudThickness * 2],
          confluenceFactors
        });
      }
    }

    // Bearish setup: Price below cloud
    if (price < Math.min(ema9, ema21) && ema9 < ema21) {
      const confluenceFactors = this.calculateConfluence(data, 'SHORT', currentBar);
      
      if (confluenceFactors.length >= 3) {
        this.createSetup(data, {
          setupType: 'CLOUD_STRATEGY',
          direction: 'SHORT',
          entryPrice: price,
          stopLoss: ema21,
          targets: [price - cloudThickness, price - cloudThickness * 2],
          confluenceFactors
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
    const swingHigh = Math.max(...recentBars.map(b => b.high));
    const swingLow = Math.min(...recentBars.map(b => b.low));
    const range = swingHigh - swingLow;

    // Fibonacci levels
    const fib382 = swingHigh - range * 0.382;
    const fib500 = swingHigh - range * 0.500;
    const fib618 = swingHigh - range * 0.618;

    const price = currentBar.close;

    // Bullish: Price near fib retracement in uptrend
    if (Math.abs(price - fib618) / price < 0.005 || Math.abs(price - fib500) / price < 0.005) {
      const confluenceFactors = this.calculateConfluence(data, 'LONG', currentBar);
      
      if (confluenceFactors.length >= 2) {
        this.createSetup(data, {
          setupType: 'FIBONACCI_PULLBACK',
          direction: 'LONG',
          entryPrice: price,
          stopLoss: swingLow,
          targets: [swingHigh, swingHigh + range * 0.618],
          confluenceFactors
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
    const high20 = Math.max(...consolidationBars.map(b => b.high));
    const low20 = Math.min(...consolidationBars.map(b => b.low));

    // Breakout above resistance
    if (currentBar.close > high20 && currentBar.volume > data.bars5m.slice(-10).reduce((sum, b) => sum + b.volume, 0) / 10) {
      const confluenceFactors = this.calculateConfluence(data, 'LONG', currentBar);
      
      if (confluenceFactors.length >= 2) {
        this.createSetup(data, {
          setupType: 'BREAKOUT',
          direction: 'LONG',
          entryPrice: currentBar.close,
          stopLoss: high20 * 0.98,
          targets: [currentBar.close * 1.02, currentBar.close * 1.05],
          confluenceFactors
        });
      }
    }

    // Breakdown below support
    if (currentBar.close < low20 && currentBar.volume > data.bars5m.slice(-10).reduce((sum, b) => sum + b.volume, 0) / 10) {
      const confluenceFactors = this.calculateConfluence(data, 'SHORT', currentBar);
      
      if (confluenceFactors.length >= 2) {
        this.createSetup(data, {
          setupType: 'BREAKOUT',
          direction: 'SHORT',
          entryPrice: currentBar.close,
          stopLoss: low20 * 1.02,
          targets: [currentBar.close * 0.98, currentBar.close * 0.95],
          confluenceFactors
        });
      }
    }
  }

  /**
   * Calculate confluence factors
   */
  private calculateConfluence(data: SymbolData, direction: 'LONG' | 'SHORT', currentBar: Bar): ConfluenceFactor[] {
    const factors: ConfluenceFactor[] = [];

    if (!data.indicators5m || !data.indicators60m) return factors;

    const ind5m = data.indicators5m;
    const ind60m = data.indicators60m;

    // EMA Alignment
    if (direction === 'LONG' && isBullishEMAAlignment(ind60m)) {
      factors.push({ factor: 'Bullish EMA Alignment (60m)', present: true, value: '9>21>50' });
    }
    if (direction === 'SHORT' && isBearishEMAAlignment(ind60m)) {
      factors.push({ factor: 'Bearish EMA Alignment (60m)', present: true, value: '9<21<50' });
    }

    // RSI
    if (ind5m.rsi14) {
      if (direction === 'LONG' && isRSIOversold(ind5m.rsi14, 35)) {
        factors.push({ factor: 'RSI Oversold', present: true, value: ind5m.rsi14.toFixed(1) });
      }
      if (direction === 'SHORT' && isRSIOverbought(ind5m.rsi14, 65)) {
        factors.push({ factor: 'RSI Overbought', present: true, value: ind5m.rsi14.toFixed(1) });
      }
    }

    // VWAP
    if (ind5m.vwap) {
      if (direction === 'LONG' && currentBar.close > ind5m.vwap) {
        factors.push({ factor: 'Price Above VWAP', present: true, value: ind5m.vwap.toFixed(2) });
      }
      if (direction === 'SHORT' && currentBar.close < ind5m.vwap) {
        factors.push({ factor: 'Price Below VWAP', present: true, value: ind5m.vwap.toFixed(2) });
      }
    }

    // Volume
    const avgVolume = data.bars5m.slice(-10).reduce((sum, b) => sum + b.volume, 0) / 10;
    if (currentBar.volume > avgVolume * 1.5) {
      factors.push({ factor: 'High Volume', present: true, value: `${((currentBar.volume / avgVolume) * 100).toFixed(0)}% of avg` });
    }

    // 200 SMA (from 60m for broader trend)
    if (ind60m.sma200) {
      if (direction === 'LONG' && currentBar.close > ind60m.sma200) {
        factors.push({ factor: 'Above 200 SMA', present: true, value: ind60m.sma200.toFixed(2) });
      }
      if (direction === 'SHORT' && currentBar.close < ind60m.sma200) {
        factors.push({ factor: 'Below 200 SMA', present: true, value: ind60m.sma200.toFixed(2) });
      }
    }

    return factors;
  }

  /**
   * Create a new setup
   */
  private createSetup(data: SymbolData, partial: Partial<DetectedSetup>): void {
    const setupId = `${data.symbol}-${++this.setupIdCounter}`;
    const now = Date.now();

    const setup: DetectedSetup = {
      id: setupId,
      symbol: data.symbol,
      setupType: partial.setupType!,
      status: 'SETUP_FORMING',
      direction: partial.direction!,
      timeframe: '5m',
      entryPrice: partial.entryPrice,
      stopLoss: partial.stopLoss,
      targets: partial.targets,
      confluenceScore: partial.confluenceFactors?.length || 0,
      confluenceFactors: partial.confluenceFactors || [],
      patientCandle: partial.patientCandle,
      indicators: data.indicators5m!,
      timestamp: now,
      lastUpdate: now
    };

    data.currentSetups.set(setupId, setup);
    
    // Emit event for WebSocket broadcast
    this.emit('setup-detected', setup);
    
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
        const direction = setup.direction === 'LONG' ? 1 : -1;
        
        setup.targets.forEach((target, i) => {
          if (direction === 1 && currentPrice >= target) {
            updated.status = 'ACTIVE';
            this.emit('target-hit', { setup: updated, targetIndex: i, price: currentPrice });
          } else if (direction === -1 && currentPrice <= target) {
            updated.status = 'ACTIVE';
            this.emit('target-hit', { setup: updated, targetIndex: i, price: currentPrice });
          }
        });
      }

      // Check if stop loss hit
      if (setup.stopLoss) {
        const direction = setup.direction === 'LONG' ? 1 : -1;
        
        if ((direction === 1 && currentPrice <= setup.stopLoss) ||
            (direction === -1 && currentPrice >= setup.stopLoss)) {
          updated.status = 'CLOSED';
          this.emit('stop-loss-hit', { setup: updated, price: currentPrice });
        }
      }

      data.currentSetups.set(id, updated);
    });
  }

  /**
   * Get market open time for a given timestamp
   */
  private getMarketOpenTime(timestamp: number): Date {
    const date = new Date(timestamp);
    date.setHours(9, 30, 0, 0); // Market opens at 9:30 AM ET
    return date;
  }

  /**
   * Get all active setups
   */
  getActiveSetups(): DetectedSetup[] {
    const allSetups: DetectedSetup[] = [];
    
    this.symbolDataMap.forEach(data => {
      data.currentSetups.forEach(setup => {
        if (setup.status !== 'CLOSED' && setup.status !== 'DISMISSED') {
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
