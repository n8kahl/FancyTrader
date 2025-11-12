import React from "react";

export type ConnectionPhase = "premarket" | "regular" | "aftermarket" | "closed";
export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";

export interface HealthBannerProps {
  status?: HealthStatus;
  reason?: string | null;
  phase?: ConnectionPhase;
  onRetry?: () => void;
  hidden?: boolean;
}

export const HealthBanner: React.FC<HealthBannerProps> = ({
  status = "unknown",
  reason = null,
  phase = "closed",
  onRetry,
  hidden = false,
}) => {
  if (hidden) return null;

  const label =
    status === "healthy"
      ? "Connected"
      : status === "degraded"
      ? "Degraded"
      : status === "down"
      ? "Offline"
      : "Unknown";

  return (
    <div role="status" data-testid="health-banner" className="border rounded-md px-3 py-2 text-sm">
      <div className="flex items-center justify-between">
        <div className="font-medium">{label}</div>
        {onRetry && (
          <button className="rounded-md border px-2 py-1" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
      {reason ? <div className="mt-1 opacity-80">{reason}</div> : null}
      <div className="sr-only">Phase: {phase}</div>
    </div>
  );
};
