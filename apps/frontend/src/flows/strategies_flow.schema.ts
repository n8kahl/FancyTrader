export type StrategiesStepId = "presets" | "library";

export type StrategiesActionId =
  | "open"
  | "save"
  | "cancel"
  | "applyPresetKCU"
  | "applyPresetMomentum"
  | "applyPresetSwing";

export type StrategiesStep = {
  id: StrategiesStepId;
  label: string;
  actions: StrategiesActionId[];
  when?: Record<string, unknown>;
};

export type StrategiesFlowConfig = {
  version: number;
  steps: StrategiesStep[];
  flags?: Partial<Record<StrategiesActionId, boolean>>;
};
