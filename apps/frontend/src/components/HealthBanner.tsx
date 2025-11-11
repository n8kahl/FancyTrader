import React from "react";
import { useReadyz } from "../hooks/useReadyz";

type Props = {
  apiBase?: string; // e.g. "http://localhost:3001"
};

const colorByState: Record<"healthy" | "stale" | "down", string> = {
  healthy: "bg-emerald-600",
  stale: "bg-amber-500",
  down: "bg-rose-600",
};

export default function HealthBanner({ apiBase = "" }: Props) {
  const { state, reason, age } = useReadyz(5000, apiBase);

  return (
    <div
      className={`${colorByState[state]} text-white px-3 py-2 text-sm flex items-center justify-between`}
    >
      <div className="font-medium">
        {state === "healthy" && "Stream: Healthy"}
        {state === "stale" && "Stream: Stale"}
        {state === "down" && "Stream: Down"}
        <span className="opacity-90 ml-2">
          ({reason}{typeof age === "number" ? `, age=${age}s` : ""})
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
