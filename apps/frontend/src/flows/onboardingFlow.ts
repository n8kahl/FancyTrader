import cfg from "../config/onboarding_flow.json";
import type {
  OnboardFlowConfig,
  OnboardStepId,
  OnboardActionId,
} from "./onboarding_flow.schema";
import { allows, type EnvCtx } from "./_shared/conditions";

export function getOnboardingActions(
  stepId: OnboardStepId,
  ctx: EnvCtx = {},
): OnboardActionId[] {
  const config = cfg as OnboardFlowConfig;
  const step = config.steps.find((s) => s.id === stepId);
  if (!step || !allows(step.when, ctx)) {
    return [];
  }
  return (step.actions ?? []).filter((action) => config.flags?.[action] !== false);
}
