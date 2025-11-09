export type WatchlistStepId = "browse" | "bulk";

export type WatchlistActionId =
  | "openManager"
  | "add"
  | "remove"
  | "bulkEnable"
  | "bulkDisable";

export type WatchlistStep = {
  id: WatchlistStepId;
  label: string;
  actions: WatchlistActionId[];
  when?: Record<string, unknown>;
};

export type WatchlistFlowConfig = {
  version: number;
  steps: WatchlistStep[];
  flags?: Partial<Record<WatchlistActionId, boolean>>;
};
