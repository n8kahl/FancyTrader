import cfg from "../config/trade_flow.json";
import type { TradeFlowConfig, TradeFlowStepId, TradeActionId } from "./trade_flow.schema";
import { allows, type EnvCtx } from "./_shared/conditions";

export function getTradeActions(stepId: TradeFlowStepId, ctx: EnvCtx = {}): TradeActionId[] {
  const config = cfg as TradeFlowConfig;
  const step = config.steps.find((s) => s.id === stepId);
  if (!step || !allows(step.when, ctx)) {
    return [];
  }
  return (step.actions ?? []).filter((action) => config.flags?.[action] !== false);
}
