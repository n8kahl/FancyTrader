export type TradeFlowStepId = "selectSymbol" | "setEntry" | "setStopsTargets" | "reviewConfirm";

export type TradeActionId =
  | "enter"
  | "trim25"
  | "trim50"
  | "add"
  | "exitAll"
  | "setStop"
  | "targetHit"
  | "custom";

export type TradeFlowStep = {
  id: TradeFlowStepId;
  label: string;
  actions: TradeActionId[];
  when?: Record<string, unknown>;
};

export type TradeFlowConfig = {
  version: number;
  steps: TradeFlowStep[];
  flags?: Partial<Record<TradeActionId, boolean>>;
};
