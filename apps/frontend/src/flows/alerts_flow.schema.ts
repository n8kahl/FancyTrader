export type AlertsStepId = "quick" | "compose";

export type AlertsActionId =
  | "custom"
  | "entry"
  | "trim25"
  | "trim50"
  | "add"
  | "targetHit"
  | "stopLoss"
  | "exitAll";

export type AlertsStep = {
  id: AlertsStepId;
  label: string;
  actions: AlertsActionId[];
  when?: Record<string, unknown>;
};

export type AlertsFlowConfig = {
  version: number;
  steps: AlertsStep[];
  flags?: Partial<Record<AlertsActionId, boolean>>;
};
