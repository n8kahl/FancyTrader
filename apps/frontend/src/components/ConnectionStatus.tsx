import React from "react";
import type { ConnectionBannerState } from "../hooks/useBackendConnection";

export type ConnectionState = ConnectionBannerState;

function bgFor(state: ConnectionState) {
  switch (state) {
    case "healthy":
      return "bg-emerald-500";
    case "degraded":
      return "bg-amber-500";
    case "offline":
    case "error":
      return "bg-rose-600";
    case "closed":
      return "bg-zinc-500";
    case "connecting":
    default:
      return "bg-sky-500";
  }
}

function labelFor(state: ConnectionState) {
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

export function ConnectionStatus(props: {
  state: ConnectionState;
  reason?: string | null;
  onRetry?: () => void;
}) {
  const { state, reason, onRetry } = props;
  const show = import.meta.env.VITE_STATUS_BANNER !== "0";
  if (!show) return null;

  const showRetry = state === "offline" || state === "error" || state === "closed";

  return (
    <div className={`w-full ${bgFor(state)} text-white text-sm`}>
      <div className="mx-auto max-w-6xl px-3 py-1.5 flex items-center gap-2">
        <span className="font-medium">{labelFor(state)}</span>
        {reason ? <span className="opacity-80">— {reason}</span> : null}
        {showRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-auto rounded-md bg-white/20 px-2 py-0.5 hover:bg-white/25 focus:outline-none"
            aria-label="Reconnect"
          >
            Reconnect
          </button>
        )}
      </div>
    </div>
  );
}
