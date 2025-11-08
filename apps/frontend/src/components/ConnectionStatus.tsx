import React from "react";
import type { ConnectionBannerState } from "../hooks/useBackendConnection";

function bgFor(state: ConnectionBannerState): string {
  switch (state) {
    case "healthy":
      return "bg-emerald-500";
    case "degraded":
      return "bg-amber-500";
    case "offline":
      return "bg-rose-600";
    case "error":
      return "bg-rose-600";
    case "closed":
      return "bg-zinc-500";
    case "connecting":
    default:
      return "bg-sky-500";
  }
}

function labelFor(state: ConnectionBannerState): string {
  switch (state) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "offline":
      return "Offline";
    case "error":
      return "Error";
    case "closed":
      return "Closed";
    case "connecting":
    default:
      return "Connecting…";
  }
}

function isBannerEnabled(): boolean {
  return import.meta.env.VITE_STATUS_BANNER !== "0";
}

export function ConnectionStatus(props: {
  state: ConnectionBannerState;
  reason?: string | null;
  onRetry?: () => void;
}): JSX.Element | null {
  const { state, reason, onRetry } = props;

  if (!isBannerEnabled()) {
    return null;
  }

  const showRetry = state === "offline" || state === "error" || state === "closed";

  return (
    <div className={`w-full ${bgFor(state)} text-white text-sm`} data-testid="connection-status-banner">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-1.5">
        <span className="font-medium">{labelFor(state)}</span>
        {reason ? <span className="opacity-80">— {reason}</span> : null}
        {showRetry && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-auto rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium hover:bg-white/30 focus:outline-none"
          >
            Reconnect
          </button>
        )}
      </div>
    </div>
  );
}
