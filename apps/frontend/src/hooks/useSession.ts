import { useEffect, useState } from "react";

export type MarketSession = "premarket" | "regular" | "aftermarket" | "closed";

type SessionPayload = { session?: string };

function normalizeSession(s: string | undefined): MarketSession {
  const n = String(s ?? "closed").toLowerCase();
  return (["premarket", "regular", "aftermarket", "closed"] as const).includes(n as any)
    ? (n as MarketSession)
    : "closed";
}

export function useSession() {
  const [session, setSession] = useState<MarketSession>("closed");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/market/status");
        const json = (await res.json()) as SessionPayload;
        if (!alive) return;
        setSession(normalizeSession(json.session));
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "session_failed");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, []);

  return { session, loading, error };
}
