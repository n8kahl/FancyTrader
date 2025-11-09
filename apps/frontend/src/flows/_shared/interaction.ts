export type GlobalActionId =
  | "openManageTrade"
  | "openDetails"
  | "openWatchlistManager"
  | "openStrategySettings"
  | "sendDiscordCustom"
  | "sendDiscordType"
  | "openBackendTest"
  | "openSetupGuide"
  | "dismiss";

export type RunActionDeps = {
  openManageTrade: (tradeId: string) => void;
  openDetails: (tradeId: string) => void;
  openWatchlistManager: () => void;
  openStrategySettings: () => void;
  sendDiscordCustom: (tradeId: string, text: string) => Promise<void> | void;
  sendDiscordType: (tradeId: string, subtype: string, text?: string) => Promise<void> | void;
  openBackendTest: () => void;
  openSetupGuide: () => void;
  dismiss: (key: string) => void;
};

export function runAction(id: GlobalActionId, args: Record<string, unknown>, deps: RunActionDeps) {
  switch (id) {
    case "openManageTrade":
      return deps.openManageTrade(String(args.tradeId));
    case "openDetails":
      return deps.openDetails(String(args.tradeId));
    case "openWatchlistManager":
      return deps.openWatchlistManager();
    case "openStrategySettings":
      return deps.openStrategySettings();
    case "sendDiscordCustom":
      return deps.sendDiscordCustom(String(args.tradeId), String(args.text ?? ""));
    case "sendDiscordType":
      return deps.sendDiscordType(
        String(args.tradeId),
        String(args.subtype ?? "CUSTOM"),
        typeof args.text === "string" ? args.text : undefined,
      );
    case "openBackendTest":
      return deps.openBackendTest();
    case "openSetupGuide":
      return deps.openSetupGuide();
    case "dismiss":
      return deps.dismiss(String(args.key ?? "onboarding"));
    default:
      return undefined;
  }
}
