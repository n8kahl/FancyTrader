import cfg from "../config/watchlist_flow.json";
import type {
  WatchlistFlowConfig,
  WatchlistStepId,
  WatchlistActionId,
} from "./watchlist_flow.schema";
import { allows, type EnvCtx } from "./_shared/conditions";

export function getWatchlistActions(
  stepId: WatchlistStepId,
  ctx: EnvCtx = {},
): WatchlistActionId[] {
  const config = cfg as WatchlistFlowConfig;
  const step = config.steps.find((s) => s.id === stepId);
  if (!step || !allows(step.when, ctx)) {
    return [];
  }
  return (step.actions ?? []).filter((action) => config.flags?.[action] !== false);
}
