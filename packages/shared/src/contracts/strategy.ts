import { z } from "zod";

export const strategyTimeframeSchema = z.enum(["1m", "5m", "15m", "1h", "1d"]);

export const mtfWindowSchema = z.object({
  tf: strategyTimeframeSchema,
  length: z.number().int().positive(),
});

export type MtfWindow = z.infer<typeof mtfWindowSchema>;

export const strategyParamsSchema = z.object({
  emaFast: z.number().positive(),
  emaSlow: z.number().positive(),
  atrLen: z.number().positive(),
  atrMultStop: z.number().positive(),
  rTargets: z.array(z.number().positive()).min(1),
  mtf: z.array(mtfWindowSchema).min(1),
  minVolume: z.number().positive().optional(),
  minTrendSlope: z.number().optional(),
  allowGaps: z.boolean().optional(),
  newsGuard: z.boolean().optional(),
});

export type StrategyParams = z.infer<typeof strategyParamsSchema>;

export const confluenceKeySchema = z.enum([
  "emaTrendAlign",
  "higherTimeframeAgree",
  "rsiDivergence",
  "breakoutRetest",
  "vwapReclaim",
]);

export type ConfluenceKey = z.infer<typeof confluenceKeySchema>;

export const confluenceScoreSchema = z.object({
  key: confluenceKeySchema,
  weight: z.number().min(0),
  present: z.boolean(),
});

export type ConfluenceScore = z.infer<typeof confluenceScoreSchema>;

export const confidenceBreakdownSchema = z.object({
  total: z.number().min(0).max(100),
  factors: z.array(confluenceScoreSchema),
});

export type ConfidenceBreakdown = z.infer<typeof confidenceBreakdownSchema>;
