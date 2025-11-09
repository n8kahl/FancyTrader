import type { StrategyParams, ConfluenceKey, MtfWindow } from "@fancytrader/shared";

const DEFAULT_R_TARGETS: number[] = [1, 2, 3];
const DEFAULT_MTF_WINDOWS: MtfWindow[] = [
  { tf: "5m", length: 50 },
  { tf: "15m", length: 50 },
];

export const defaultStrategyParams: StrategyParams = {
  emaFast: 9,
  emaSlow: 21,
  atrLen: 14,
  atrMultStop: 1.5,
  rTargets: DEFAULT_R_TARGETS,
  mtf: DEFAULT_MTF_WINDOWS,
  minVolume: 150_000,
  minTrendSlope: 0.2,
  allowGaps: true,
  newsGuard: false,
};

export const defaultConfluenceWeights: { key: ConfluenceKey; weight: number }[] = [
  { key: "emaTrendAlign", weight: 30 },
  { key: "higherTimeframeAgree", weight: 25 },
  { key: "rsiDivergence", weight: 15 },
  { key: "breakoutRetest", weight: 15 },
  { key: "vwapReclaim", weight: 15 },
];
