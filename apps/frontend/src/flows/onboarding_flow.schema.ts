export type OnboardStepId = "firstRun" | "backendCheck";

export type OnboardActionId = "openBackendTest" | "openSetupGuide" | "dismiss";

export type OnboardStep = {
  id: OnboardStepId;
  label: string;
  actions: OnboardActionId[];
  when?: Record<string, unknown>;
};

export type OnboardFlowConfig = {
  version: number;
  steps: OnboardStep[];
  flags?: Partial<Record<OnboardActionId, boolean>>;
};
