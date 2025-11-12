import { useEffect, useRef, useState } from "react";
import { getBackendUrl } from "../utils/env";

export type SessionPhase = "pre" | "regular" | "after" | "closed" | "unknown";

const mapSessionToPhase = (session?: string): SessionPhase => {
  if (!session) return "unknown";
  const normalized = session.toLowerCase();
  if (normalized.includes("early") || normalized.includes("pre")) return "pre";
  if (normalized === "open" || normalized === "regular") return "regular";
  if (normalized.includes("late") || normalized.includes("after")) return "after";
  if (normalized === "closed") return "closed";
  return "unknown";
};

export function useSession(pollMs = 30000, baseUrl?: string) {
  const [phase, setPhase] = useState<SessionPhase>("unknown");
  const timer = useRef<number>();
  const controller = useRef<AbortController>();
  const url = baseUrl?.trim() ? baseUrl : getBackendUrl();

  useEffect(() => {
    let cancelled = false;

    const fetchPhase = async () => {
      controller.current?.abort();
      controller.current = new AbortController();
      try {
        const response = await fetch(`${url}/api/market/status`, {
          cache: "no-store",
          signal: controller.current.signal,
        });
        if (!response.ok) {
          throw new Error(`Status ${response.status}`);
        }
        const json = await response.json();
        if (!cancelled) {
          setPhase(mapSessionToPhase(json.session));
        }
      } catch (error) {
        if (!cancelled) {
          setPhase("unknown");
        }
      } finally {
        if (!cancelled) {
          timer.current = globalThis.setTimeout(fetchPhase, pollMs);
        }
      }
    };

    fetchPhase();

    return () => {
      cancelled = true;
      if (controller.current) {
        controller.current.abort();
      }
      if (timer.current) {
        globalThis.clearTimeout(timer.current);
      }
    };
  }, [url, pollMs]);

  return { phase };
}
