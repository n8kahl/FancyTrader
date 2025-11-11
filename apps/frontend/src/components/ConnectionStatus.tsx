import React from "react";
import type { ConnectionBannerState } from "../hooks/useBackendConnection";

type Props = {
  state: ConnectionBannerState;
  reason?: string;
  /** Optional retry handler for a “Try again” button */
  onRetry?: () => void;
};

const styles: Record<Props["state"], string> = {
  healthy: "bg-green-50 text-green-800 border-green-300",
  reconnecting: "bg-amber-50 text-amber-800 border-amber-300",
  degraded: "bg-amber-50 text-amber-800 border-amber-300",
  connecting: "bg-blue-50 text-blue-800 border-blue-300",
  offline: "bg-gray-50 text-gray-800 border-gray-300",
  closed: "bg-zinc-50 text-zinc-800 border-zinc-300",
  error: "bg-red-50 text-red-800 border-red-300",
};

export default function ConnectionStatus({ state, reason, onRetry }: Props) {
  return (
    <div className={`border rounded-md px-3 py-2 text-sm ${styles[state]}`} role="status">
      <div className="flex items-center justify-between gap-4">
        <div className="font-medium">
          {state === "healthy" && "Connected"}
          {state === "reconnecting" && "Reconnecting…"}
          {state === "offline" && "Offline"}
          {state === "error" && "Connection error"}
        </div>
        {onRetry && (
          <button
            type="button"
            className="rounded-md border px-2 py-1 text-xs hover:bg-white/40"
            onClick={onRetry}
          >
            Try again
          </button>
        )}
      </div>
      {reason && <div className="mt-1 opacity-80">{reason}</div>}
    </div>
  );
}
