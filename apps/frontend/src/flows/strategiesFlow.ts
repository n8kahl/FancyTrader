import cfg from "../config/strategies_flow.json";
import type {
  StrategiesFlowConfig,
  StrategiesStepId,
  StrategiesActionId,
} from "./strategies_flow.schema";
import { allows, type EnvCtx } from "./_shared/conditions";

export function getStrategyActions(
  stepId: StrategiesStepId,
  ctx: EnvCtx = {},
): StrategiesActionId[] {
  const config = cfg as StrategiesFlowConfig;
  const step = config.steps.find((s) => s.id === stepId);
  if (!step || !allows(step.when, ctx)) {
    return [];
  }
  return (step.actions ?? []).filter((action) => config.flags?.[action] !== false);
}
