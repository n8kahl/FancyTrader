import { z } from "zod";

export const directionSchema = z.enum(["LONG", "SHORT"]);
export const tradeStatusSchema = z.enum([
  "MONITORING",
  "SETUP_FORMING",
  "SETUP_READY",
  "ACTIVE",
  "PARTIAL_EXIT",
  "CLOSED",
  "DISMISSED",
  "REENTRY_SETUP",
]);


export const setupTypeSchema = z.enum([
  "ORB_PC",
  "EMA_BOUNCE",
  "VWAP_STRATEGY",
  "KING_QUEEN",
  "CLOUD_STRATEGY",
  "FIBONACCI_PULLBACK",
  "REVERSAL_SETUP",
  "MOMENTUM_CONTINUATION",
  "BREAKOUT",
  "PULLBACK",
]);

export const tradeStateSchema = z.enum(["SETUP", "LOADED", "ENTERED", "ACTIVE", "CLOSED"]);
export const alertTypeSchema = z.enum([
  "LOAD",
  "ENTRY",
  "TRIM_25",
  "TRIM_50",
  "ADD",
  "STOP_ADJUST",
  "TARGET_HIT",
  "EXIT_ALL",
  "CUSTOM",
]);

export const alertConditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("priceAbove"), value: z.number() }),
  z.object({ type: z.literal("priceBelow"), value: z.number() }),
  z.object({ type: z.literal("crossesAbove"), value: z.number() }),
  z.object({ type: z.literal("crossesBelow"), value: z.number() }),
]);

export const confluenceFactorSchema = z.object({
  factor: z.string(),
  value: z.union([z.string(), z.number()]),
  strength: z.enum(["HIGH", "MEDIUM", "LOW"]),
  present: z.boolean(),
  description: z.string().optional(),
});

export const patientCandleSchema = z.object({
  isContained: z.boolean(),
  pcHigh: z.number(),
  pcLow: z.number(),
  pcOpen: z.number(),
  pcClose: z.number(),
  priorHigh: z.number(),
  priorLow: z.number(),
  priorOpen: z.number(),
  priorClose: z.number(),
  direction: directionSchema,
});

export const priceCandleSchema = z.object({
  timestamp: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional(),
});

export const optionsContractSchema = z.object({
  symbol: z.string(),
  strike: z.number(),
  type: z.enum(["CALL", "PUT"]),
  expiration: z.string(),
  expirationDisplay: z.string(),
  daysToExpiry: z.number(),
  premium: z.number(),
  delta: z.number(),
  breakEven: z.number(),
  isITM: z.boolean(),
  distanceFromPrice: z.number(),
  projectedProfit: z.number().optional(),
  projectedProfitPercent: z.number().optional(),
});

export const positionTrackingSchema = z.object({
  entryPremium: z.number(),
  currentPremium: z.number(),
  realizedPL: z.number(),
  unrealizedPL: z.number(),
  totalPL: z.number(),
  totalPLPercent: z.number(),
  positionSize: z.number(),
});

export const tradeAlertSchema = z.object({
  id: z.string(),
  type: alertTypeSchema,
  message: z.string(),
  timestamp: z.string(),
  contractPrice: z.number().optional(),
  profitLoss: z.number().optional(),
  profitLossPercent: z.number().optional(),
});

export const tradeSchema = z
  .object({
    id: z.string(),
    symbol: z.string(),
    setup: z.string(),
    status: tradeStatusSchema,
    tradeState: tradeStateSchema,
    alertHistory: z.array(tradeAlertSchema),
    direction: directionSchema.optional(),
    conviction: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
    timeframe: z.string().optional(),
    dayType: z.enum(["TREND", "CHOP", "UNKNOWN"]).optional(),
    event: z.enum(["FOMC", "CPI", "EARNINGS"]).nullable().optional(),
    marketPhase: z
      .enum(["PRE_MARKET", "ORB_FORMING", "POST_10", "CLOUD_WINDOW", "CLOSE", "UNKNOWN"])
      .optional(),
    price: z.number().optional(),
    change: z.number().optional(),
    changePercent: z.number().optional(),
    entry: z.number().optional(),
    target: z.number().optional(),
    stop: z.number().optional(),
    riskReward: z.string().optional(),
    entryPrice: z.number().optional(),
    currentPrice: z.number().optional(),
    stopLoss: z.number().optional(),
    targets: z.array(z.number()).optional(),
    profitLoss: z.number().optional(),
    profitLossPercent: z.number().optional(),
    confluenceScore: z.number().optional(),
    confluenceFactors: z.array(confluenceFactorSchema).optional(),
    confluenceDetails: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    patientCandle: patientCandleSchema.optional(),
    priceData: z.array(priceCandleSchema).optional(),
    warnings: z.record(z.boolean()).optional(),
    optionsContract: optionsContractSchema.optional(),
    position: positionTrackingSchema.optional(),
    indicators: z.record(z.union([z.number(), z.string(), z.boolean()])).optional(),
    timestamp: z.number().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    notes: z.string().optional(),
    watchlistPriority: z.number().optional(),
  })
  .passthrough();

export type Trade = z.infer<typeof tradeSchema>;
export type OptionContract = z.infer<typeof optionsContractSchema>;
export type Direction = z.infer<typeof directionSchema>;
export type TradeStatus = z.infer<typeof tradeStatusSchema>;

export type SetupType = z.infer<typeof setupTypeSchema>;
export type AlertCondition = z.infer<typeof alertConditionSchema>;

export const serviceStateSchema = z.object({
  source: z.literal("polygon"),
  status: z.enum(["initializing", "healthy", "degraded", "offline"]),
  reason: z.string().optional(),
  timestamp: z.number(),
});

const wsSubscriptionSchema = z.object({
  symbols: z.array(z.string().min(1)).nonempty(),
});

export const wsInboundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SUBSCRIBE"), payload: wsSubscriptionSchema }),
  z.object({ type: z.literal("UNSUBSCRIBE"), payload: wsSubscriptionSchema }),
  z.object({ type: z.literal("PING"), payload: z.unknown().optional() }),
]);

const statusMessageSchema = z.object({ type: z.literal("STATUS"), message: z.string() });
const errorMessageSchema = z.object({
  type: z.literal("ERROR"),
  message: z.string(),
  code: z.string().optional(),
});
const subscriptionsMessageSchema = z.object({
  type: z.literal("SUBSCRIPTIONS"),
  symbols: z.array(z.string()),
});
const priceUpdateMessageSchema = z.object({
  type: z.literal("PRICE_UPDATE"),
  symbol: z.string(),
  price: z.number(),
  time: z.number(),
});
const alertMessageSchema = z.object({
  type: z.literal("ALERT"),
  id: z.string(),
  symbol: z.string(),
  price: z.number(),
  timestamp: z.number(),
  condition: alertConditionSchema,
});
const setupUpdateMessageSchema = z.object({
  type: z.literal("SETUP_UPDATE"),
  payload: z
    .object({
      action: z.string().optional(),
      setup: z.record(z.unknown()).optional(),
      setups: z.array(z.record(z.unknown())).optional(),
      targetIndex: z.number().optional(),
    })
    .optional(),
  timestamp: z.number().optional(),
});
const pongMessageSchema = z.object({ type: z.literal("PONG"), timestamp: z.number() });
const serviceStateMessageSchema = z.object({
  type: z.literal("SERVICE_STATE"),
  payload: serviceStateSchema,
  timestamp: z.number().optional(),
});

export const wsOutboundSchema = z.discriminatedUnion("type", [
  priceUpdateMessageSchema,
  statusMessageSchema,
  errorMessageSchema,
  subscriptionsMessageSchema,
  alertMessageSchema,
  setupUpdateMessageSchema,
  serviceStateMessageSchema,
  pongMessageSchema,
]);

export type WSInbound = z.infer<typeof wsInboundSchema>;
export type WSOutbound = z.infer<typeof wsOutboundSchema>;
export type ServiceState = z.infer<typeof serviceStateSchema>;
