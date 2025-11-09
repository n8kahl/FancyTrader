import cfg from "../config/alerts_flow.json";
import type { AlertsFlowConfig, AlertsStepId, AlertsActionId } from "./alerts_flow.schema";
import { allows, type EnvCtx } from "./_shared/conditions";

export function getAlertActions(stepId: AlertsStepId, ctx: EnvCtx = {}): AlertsActionId[] {
  const config = cfg as AlertsFlowConfig;
  const step = config.steps.find((s) => s.id === stepId);
  if (!step || !allows(step.when, ctx)) {
    return [];
  }
  return (step.actions ?? []).filter((action) => config.flags?.[action] !== false);
}
