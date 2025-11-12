import { useEffect, useState } from "react";

type ReadyzPayload = { ok: boolean };

export function useReadyz(pollMs = 0) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/readyz", { method: "GET" });
        if (!res.ok) {
          throw new Error(`readyz fetch ${res.status}`);
        }
        const okStatus = res.ok;
        let ok = false;
        try {
          const body = (await res.json()) as ReadyzPayload;
          ok = Boolean(body?.ok);
        } catch {
          ok = okStatus;
        }
        if (!alive) return;
        setReady(okStatus && ok);
      } catch (e: any) {
        if (!alive) return;
        setReady(false);
        setError(e?.message ?? "readyz_failed");
      } finally {
        if (!alive) return;
        setLoading(false);
        if (pollMs > 0) {
          timer = setTimeout(run, pollMs);
        }
      }
    };

    run();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [pollMs]);

  return { ready, loading, error };
}
