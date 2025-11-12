import React from "react";
import { useReadyz } from "../hooks/useReadyz";
import { useSession } from "../hooks/useSession";
import { useMockMode } from "../hooks/useMockMode";

type Props = {
  apiBase: string;
};

export default function HealthBanner({ apiBase }: Props) {
  const mockMode = useMockMode();
  const { phase } = useSession();
  const readyz = useReadyz(5000, apiBase, { sessionPhase: phase, mockMode });

  if (mockMode || phase === "closed" || readyz.status !== "down") {
    return null;
  }

  return (
    <div className="bg-rose-600 text-white px-3 py-2 text-sm flex items-center justify-between">
      <div className="font-medium">
        Stream: Down
        <span className="opacity-90 ml-2">
          ({readyz.reason ?? "Connection issue"})
        </span>
      </div>
      <button
        className="bg-white/15 hover:bg-white/25 transition rounded px-2 py-1 text-xs"
        onClick={() => window.location.reload()}
      >
        Refresh
      </button>
    </div>
  );
}
