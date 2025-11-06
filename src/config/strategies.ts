// Strategy Library - Modular system for different trading methodologies

export type StrategyCategory = "KCU_LTP" | "BREAKOUT" | "REVERSAL" | "MOMENTUM" | "INTRADAY" | "SWING" | "OPTIONS";

export interface StrategyDefinition {
  id: string;
  name: string;
  category: StrategyCategory;
  description: string;
  requiredConfluence?: string[]; // Optional confluence factors
  timeframes: string[];
  isEnabled: boolean; // Allow admins to enable/disable strategies
  validationRules?: {
    requiresPatientCandle?: boolean;
    requiresTrend?: boolean;
    requiresVolume?: boolean;
    minimumRR?: number;
  };
}

// KCU LTP Strategies
export const KCU_STRATEGIES: StrategyDefinition[] = [
  {
    id: "orb_pc",
    name: "ORB + PC",
    category: "KCU_LTP",
    description: "Opening Range Breakout with Patient Candle confirmation at key level",
    requiredConfluence: ["ORB Line", "Patient Candle"],
    timeframes: ["5m", "2m"],
    isEnabled: true,
    validationRules: {
      requiresPatientCandle: true,
      minimumRR: 2,
    }
  },
  {
    id: "ema8_bounce",
    name: "EMA(8) Bounce + PC",
    category: "KCU_LTP",
    description: "Bounce off 8-EMA with Patient Candle at level",
    requiredConfluence: ["8-EMA", "Patient Candle"],
    timeframes: ["5m", "2m"],
    isEnabled: true,
    validationRules: {
      requiresPatientCandle: true,
      requiresTrend: true,
      minimumRR: 2,
    }
  },
  {
    id: "vwap_strategy",
    name: "VWAP Strategy",
    category: "KCU_LTP",
    description: "VWAP + level alignment (post 10:00 ET only)",
    requiredConfluence: ["VWAP", "Hourly Level"],
    timeframes: ["5m", "2m"],
    isEnabled: true,
    validationRules: {
      requiresPatientCandle: true,
      minimumRR: 2,
    }
  },
  {
    id: "king_queen",
    name: "King & Queen",
    category: "KCU_LTP",
    description: "Triple confluence: ORB + VWAP + 8-EMA alignment",
    requiredConfluence: ["ORB Line", "VWAP", "8-EMA"],
    timeframes: ["5m", "2m"],
    isEnabled: true,
    validationRules: {
      requiresPatientCandle: true,
      requiresTrend: true,
      minimumRR: 2,
    }
  },
  {
    id: "cloud_strategy",
    name: "Cloud Strategy",
    category: "KCU_LTP",
    description: "Afternoon cloud trade (1:30-3:30 ET window)",
    requiredConfluence: ["21-EMA", "Cloud"],
    timeframes: ["5m"],
    isEnabled: true,
    validationRules: {
      requiresPatientCandle: true,
      minimumRR: 1.5,
    }
  },
  {
    id: "fib_pullback",
    name: "Fibonacci Pullback",
    category: "KCU_LTP",
    description: "Pullback to key Fib level (0.382, 0.5, 0.618) with PC",
    requiredConfluence: ["Fibonacci", "Patient Candle"],
    timeframes: ["5m", "15m"],
    isEnabled: true,
    validationRules: {
      requiresPatientCandle: true,
      requiresTrend: true,
      minimumRR: 2,
    }
  },
  {
    id: "level_rejection",
    name: "Level Rejection",
    category: "KCU_LTP",
    description: "Clean rejection at hourly/daily level with PC",
    requiredConfluence: ["Hourly Level", "Patient Candle"],
    timeframes: ["5m", "2m"],
    isEnabled: true,
    validationRules: {
      requiresPatientCandle: true,
      minimumRR: 2,
    }
  },
];

// Universal/Generic Strategies
export const UNIVERSAL_STRATEGIES: StrategyDefinition[] = [
  {
    id: "break_retest",
    name: "Breakout Retest",
    category: "BREAKOUT",
    description: "Structural breakout followed by reclaim/retest of the zone",
    requiredConfluence: ["Structural Level", "Volume Surge", "EM Slope"],
    timeframes: ["5m", "15m", "1h", "4h"],
    isEnabled: true,
    validationRules: {
      requiresVolume: true,
      minimumRR: 2,
    }
  },
  {
    id: "power_hour",
    name: "Power Hour",
    category: "INTRADAY",
    description: "VWAP reclaim or failure in final hour (post 2:30 PM ET)",
    requiredConfluence: ["VWAP", "Trend Inflection"],
    timeframes: ["5m", "15m"],
    isEnabled: true,
    validationRules: {
      requiresVolume: true,
      requiresTrend: true,
      minimumRR: 1.5,
    }
  },
  {
    id: "exhaustion_reversal",
    name: "Exhaustion Reversal",
    category: "REVERSAL",
    description: "Rejection wick at structural extreme + MFE failure",
    requiredConfluence: ["Structural Extreme", "Rejection Wick", "Overextended ATR"],
    timeframes: ["1m", "5m", "15m"],
    isEnabled: true,
    validationRules: {
      requiresVolume: true,
      minimumRR: 1.5,
    }
  },
  {
    id: "em_rejoin",
    name: "EM Rejoin",
    category: "SWING",
    description: "Tap or reclaim of key EMA band (21/55) post consolidation",
    requiredConfluence: ["EMA Band", "Consolidation", "Bias Continuation"],
    timeframes: ["1h", "4h", "1d"],
    isEnabled: true,
    validationRules: {
      requiresTrend: true,
      minimumRR: 2,
    }
  },
  {
    id: "compression_break",
    name: "Compression Break",
    category: "BREAKOUT",
    description: "Break from low ATR range with expanding volume",
    requiredConfluence: ["Low ATR", "Volume Expansion", "RVOL Spike"],
    timeframes: ["1m", "5m", "15m"],
    isEnabled: true,
    validationRules: {
      requiresVolume: true,
      minimumRR: 1.5,
    }
  },
  {
    id: "opening_gap_fill",
    name: "Opening Gap Fill",
    category: "INTRADAY",
    description: "Rejection at open print; drive toward prior close (gap > 0.75%)",
    requiredConfluence: ["Gap > 0.75%", "Premarket Imbalance", "Rejection at Open"],
    timeframes: ["1m", "5m"],
    isEnabled: true,
    validationRules: {
      minimumRR: 1.5,
    }
  },
  {
    id: "reversal_pattern",
    name: "Reversal Pattern",
    category: "REVERSAL",
    description: "Double bottom/top, head & shoulders, or V-reversal",
    requiredConfluence: ["Pattern Recognition", "Volume"],
    timeframes: ["15m", "1h", "4h"],
    isEnabled: true,
    validationRules: {
      requiresVolume: true,
      minimumRR: 2,
    }
  },
  {
    id: "bullish_flag",
    name: "Bullish Flag Breakout",
    category: "MOMENTUM",
    description: "Consolidation after strong move, breaks to upside",
    requiredConfluence: ["Pattern Recognition", "Volume", "Trend"],
    timeframes: ["5m", "15m", "1h"],
    isEnabled: true,
    validationRules: {
      requiresVolume: true,
      requiresTrend: true,
      minimumRR: 2,
    }
  },
  {
    id: "bearish_flag",
    name: "Bearish Flag Breakout",
    category: "MOMENTUM",
    description: "Consolidation after strong drop, breaks to downside",
    requiredConfluence: ["Pattern Recognition", "Volume", "Trend"],
    timeframes: ["5m", "15m", "1h"],
    isEnabled: true,
    validationRules: {
      requiresVolume: true,
      requiresTrend: true,
      minimumRR: 2,
    }
  },
  {
    id: "support_resistance",
    name: "Support/Resistance Bounce",
    category: "SWING",
    description: "Clean bounce off established S/R level",
    requiredConfluence: ["S/R Level", "Volume"],
    timeframes: ["15m", "1h", "4h", "1d"],
    isEnabled: true,
    validationRules: {
      minimumRR: 2,
    }
  },
  {
    id: "gap_fill",
    name: "Gap Fill Play",
    category: "INTRADAY",
    description: "Price moving to fill overnight or session gap",
    requiredConfluence: ["Gap Identified", "Volume"],
    timeframes: ["5m", "15m"],
    isEnabled: true,
    validationRules: {
      requiresVolume: true,
      minimumRR: 1.5,
    }
  },
  {
    id: "moving_average_cross",
    name: "Moving Average Cross",
    category: "MOMENTUM",
    description: "Fast MA crosses above/below slow MA with momentum",
    requiredConfluence: ["MA Cross", "Volume", "Trend"],
    timeframes: ["15m", "1h", "4h"],
    isEnabled: true,
    validationRules: {
      requiresTrend: true,
      minimumRR: 2,
    }
  },
  {
    id: "opening_range",
    name: "Opening Range Breakout",
    category: "BREAKOUT",
    description: "Break of first 30-60min range with volume",
    requiredConfluence: ["Opening Range", "Volume"],
    timeframes: ["5m", "15m"],
    isEnabled: true,
    validationRules: {
      requiresVolume: true,
      minimumRR: 2,
    }
  },
  {
    id: "squeeze_breakout",
    name: "Squeeze Breakout",
    category: "BREAKOUT",
    description: "Tight consolidation (low ATR) breaks with expansion",
    requiredConfluence: ["Low Volatility", "Volume Spike"],
    timeframes: ["5m", "15m", "1h"],
    isEnabled: true,
    validationRules: {
      requiresVolume: true,
      minimumRR: 2,
    }
  },
];

// Options-Centric Strategies
export const OPTIONS_STRATEGIES: StrategyDefinition[] = [
  {
    id: "iv_expansion_breakout",
    name: "IV Expansion Breakout",
    category: "OPTIONS",
    description: "Breakout in underlying + IVP rises > 10% from EM basis",
    requiredConfluence: ["Price Breakout", "IVP Spike", "IV > EM"],
    timeframes: ["15m", "1h", "4h"],
    isEnabled: true,
    validationRules: {
      requiresVolume: true,
      minimumRR: 2,
    }
  },
  {
    id: "zero_dte_premium",
    name: "Zero DTE Premium Harvest",
    category: "OPTIONS",
    description: "Post-open IV stabilization (after 10:30 AM ET) theta play",
    requiredConfluence: ["IV Stabilization", "Post-10:30 AM", "Theta Decay"],
    timeframes: ["1m", "5m"],
    isEnabled: true,
    validationRules: {
      minimumRR: 1.5,
    }
  },
  {
    id: "skew_compression_reversal",
    name: "Skew Compression Reversal",
    category: "OPTIONS",
    description: "HTF level touch + compression in call/put skew signals reversion",
    requiredConfluence: ["HTF Level", "Skew Compression", "Mean Reversion"],
    timeframes: ["1h", "4h", "1d"],
    isEnabled: true,
    validationRules: {
      minimumRR: 2,
    }
  },
  {
    id: "dealer_gamma_flip",
    name: "Dealer Gamma Flip",
    category: "OPTIONS",
    description: "SPX/NDX gamma exposure flips from + to - (trend shift)",
    requiredConfluence: ["Gamma Flip", "Dealer Hedging", "OPEX Proximity"],
    timeframes: ["1h", "4h", "1d"],
    isEnabled: true,
    validationRules: {
      requiresTrend: true,
      minimumRR: 2,
    }
  },
  {
    id: "iv_rank_rejoin",
    name: "IV Rank Rejoin",
    category: "OPTIONS",
    description: "IV Rank < 20 rising + price holds EM (low IV breakout entry)",
    requiredConfluence: ["IV Rank < 20", "Rising IV", "Price Above EM"],
    timeframes: ["1h", "4h", "1d"],
    isEnabled: true,
    validationRules: {
      requiresTrend: true,
      minimumRR: 2,
    }
  },
];

// Combined strategy library
export const ALL_STRATEGIES = [...KCU_STRATEGIES, ...UNIVERSAL_STRATEGIES, ...OPTIONS_STRATEGIES];

// Helper functions
export function getStrategyById(id: string): StrategyDefinition | undefined {
  return ALL_STRATEGIES.find(s => s.id === id);
}

export function getStrategiesByCategory(category: StrategyCategory): StrategyDefinition[] {
  return ALL_STRATEGIES.filter(s => s.category === category);
}

export function getEnabledStrategies(): StrategyDefinition[] {
  return ALL_STRATEGIES.filter(s => s.isEnabled);
}

export function getCategoryLabel(category: StrategyCategory): string {
  const labels: Record<StrategyCategory, string> = {
    KCU_LTP: "KCU LTP",
    BREAKOUT: "Breakout",
    REVERSAL: "Reversal",
    MOMENTUM: "Momentum",
    INTRADAY: "Intraday",
    SWING: "Swing Trading",
    OPTIONS: "Options Flow",
  };
  return labels[category];
}

// Strategy presets for different use cases
export interface StrategyPreset {
  id: string;
  name: string;
  description: string;
  enabledStrategies: string[];
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: "kcu_only",
    name: "KCU LTP Only",
    description: "Only KCU-specific LTP strategies",
    enabledStrategies: KCU_STRATEGIES.map(s => s.id),
  },
  {
    id: "intraday_scalping",
    name: "Intraday Scalping",
    description: "Fast-paced intraday strategies",
    enabledStrategies: ["orb_pc", "break_retest", "power_hour", "opening_range", "opening_gap_fill", "exhaustion_reversal", "compression_break"],
  },
  {
    id: "swing_trading",
    name: "Swing Trading",
    description: "Higher timeframe swing strategies",
    enabledStrategies: ["reversal_pattern", "support_resistance", "moving_average_cross", "fib_pullback", "em_rejoin"],
  },
  {
    id: "momentum",
    name: "Momentum Trading",
    description: "Trend and momentum continuation",
    enabledStrategies: ["bullish_flag", "bearish_flag", "ema8_bounce", "moving_average_cross", "squeeze_breakout"],
  },
  {
    id: "options_flow",
    name: "Options Flow",
    description: "Options-centric strategies with IV/Gamma/Skew",
    enabledStrategies: OPTIONS_STRATEGIES.map(s => s.id),
  },
  {
    id: "all_strategies",
    name: "All Strategies",
    description: "Enable all available strategies",
    enabledStrategies: ALL_STRATEGIES.map(s => s.id),
  },
];
