/**
 * Public API for @fancytrader/shared
 * Keep exports minimal to avoid duplicate symbol conflicts.
 */
export * from "./trading";
export {
  directionSchema,
  tradeStatusSchema,
  setupTypeSchema,
  tradeStateSchema,
  alertTypeSchema,
  alertConditionSchema,
  confluenceFactorSchema,
  patientCandleSchema,
  priceCandleSchema,
  optionsContractSchema,
  positionTrackingSchema,
  tradeAlertSchema,
  tradeSchema,
  wsInboundSchema,
  wsOutboundSchema,
  serviceStateSchema,
} from "./schemas";

export type { AlertCondition, ServiceState } from "./schemas";

export * from "./client/contracts";
export * from "./client/ws";
export * from "./client/massive";
export * from "./massive/snapshots";

export * from "./contracts/strategy";

export { serverEnv } from "./env.server";
export { clientEnv } from "./env.client";
