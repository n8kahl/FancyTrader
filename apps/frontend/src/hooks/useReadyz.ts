import { useEffect, useRef, useState } from "react";
import { SessionPhase } from "./useSession";

export type ReadyzState = {
  status: "ok" | "unknown" | "down";
  reason?: string;
  lastChecked: number | null;
};

export type ReadyzOptions = {
  sessionPhase?: SessionPhase;
  mockMode?: boolean;
};

const MAX_BACKOFF = 30_000;

export function useReadyz(
  pollMs = 5000,
  baseUrl = "",
  options: ReadyzOptions = {}
): ReadyzState {
  const endpoint = baseUrl ? `${baseUrl.replace(/\/+$/, "")}/readyz` : "/readyz";
  const { sessionPhase, mockMode } = options;
  const [state, setState] = useState<ReadyzState>({
    status: "unknown",
    lastChecked: null,
  });
  const historyRef = useRef<boolean[]>([]);
  const timer = useRef<number>();
  const delayRef = useRef(pollMs);

  useEffect(() => {
    let cancelled = false;
    historyRef.current = [];
    delayRef.current = pollMs;

    const updateState = (success: boolean, reason?: string) => {
      const nextHistory = [success, ...historyRef.current].slice(0, 3);
      historyRef.current = nextHistory;
      const hasFailure = nextHistory.some((entry) => entry === false);
      const consecutiveDown =
        nextHistory[0] === false &&
        nextHistory[1] === false &&
        mockMode !== true &&
        sessionPhase !== "closed";
      let nextStatus: ReadyzState["status"] = "unknown";
      if (!success) {
        nextStatus = consecutiveDown ? "down" : "unknown";
      } else {
        nextStatus = hasFailure ? "unknown" : "ok";
      }
      const nextReason = !success ? reason ?? "readyz failure" : hasFailure ? reason : undefined;
      setState({ status: nextStatus, reason: nextReason, lastChecked: Date.now() });
    };

    const schedule = () => {
      if (timer.current) {
        globalThis.clearTimeout(timer.current);
      }
      timer.current = globalThis.setTimeout(fetchOnce, delayRef.current);
    };

    const fetchOnce = async () => {
      let success = false;
      let failureReason: string | undefined;
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`readyz fetch ${response.status}`);
        }
        const payload = await response.json();
        success = payload?.ok === true;
        if (!success) {
          failureReason = payload?.checks?.reason ?? "readyz reported failure";
        }
      } catch (error) {
        failureReason = error instanceof Error ? error.message : String(error);
      }

      if (success) {
        delayRef.current = pollMs;
      } else {
        delayRef.current = Math.min(MAX_BACKOFF, Math.max(pollMs, delayRef.current * 2 || pollMs));
      }

      updateState(success, failureReason);

      if (!cancelled) {
        schedule();
      }
    };

    fetchOnce();

    return () => {
      cancelled = true;
      if (timer.current) {
        globalThis.clearTimeout(timer.current);
      }
    };
  }, [endpoint, pollMs, sessionPhase, mockMode]);

  return state;
}
