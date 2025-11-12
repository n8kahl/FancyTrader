import { useEffect, useRef, useState } from "react";

export type Readyz = {
  ok: boolean;
  checks: {
    massiveKey: boolean;
    websocketReady: boolean;
    restReachable: boolean;
    streamingEnabled: boolean;
    lastMessageAt: number | null;
    messageAgeSec: number | null;
    freshnessOk: boolean;
  };
};

type Health = {
  state: "healthy" | "stale" | "down";
  reason: string;
  age: number | null;
  raw?: Readyz;
};

export function useReadyz(pollMs = 5000, baseUrl = ""): Health {
  const [health, setHealth] = useState<Health>({
    state: "down",
    reason: "initializing…",
    age: null,
  });
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const res = await fetch(`${baseUrl}/readyz`, { cache: "no-store" });
        const json = (await res.json()) as Readyz;

        if (cancelled) return;

        const age = json.checks?.messageAgeSec ?? null;
        let state: Health["state"] = "down";
        let reason = "unknown";
        if (json.ok) {
          state = "healthy";
          reason = "stream fresh";
        } else if (json.checks?.websocketReady && json.checks?.freshnessOk === false) {
          state = "stale";
          reason = `no messages for ${age ?? "?"}s`;
        } else {
          state = "down";
          reason = !json.checks.websocketReady ? "websocket not ready" : "readiness failed";
        }

        setHealth({ state, reason, age, raw: json });
      } catch (e) {
        if (!cancelled) {
          setHealth({ state: "down", reason: "fetch failed", age: null });
        }
      }
    };

    fetchOnce();
    timer.current = window.setInterval(fetchOnce, pollMs);
    return () => {
      cancelled = true;
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [pollMs, baseUrl]);

  return health;
}
