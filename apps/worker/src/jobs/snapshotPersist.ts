import { createClient } from "@supabase/supabase-js";
import { MassiveClient } from "@fancytrader/shared";
import { serverEnv } from "@fancytrader/shared/server";
import { workerEnv } from "../env";

export async function persistSnapshots(symbols: string[]) {
  if (!symbols?.length) return 0;
  const url = serverEnv.SUPABASE_URL;
  const key = serverEnv.SUPABASE_SERVICE_KEY;
  if (!(url && key)) return 0;

  const sb = createClient(url, key, { auth: { persistSession: false } });
  const massive = new MassiveClient({
    baseUrl: workerEnv.MASSIVE_BASE_URL,
    socketUrl: workerEnv.MASSIVE_SOCKET_URL,
    apiKey: workerEnv.MASSIVE_API_KEY,
  });

  const rows: Array<{ symbol: string; asof: string; data: unknown; source: string }> = [];

  const indices = symbols.filter((s) => s.startsWith("^"));
  if (indices.length) {
    try {
      const data: any = await massive.getIndexSnapshots(indices);
      const list = Array.isArray(data?.results) ? data.results : [];
      for (const item of list) {
        const symbol = item?.symbol ?? item?.ticker;
        if (!symbol) continue;
        rows.push({ symbol, asof: new Date().toISOString(), data: item, source: "massive" });
      }
    } catch (e) {
      // continue for singles
    }
  }

  const singles = symbols.filter((s) => !s.startsWith("^"));
  for (const s of singles) {
    try {
      const data = await massive.getMinuteAggs(s, 30);
      rows.push({ symbol: s, asof: new Date().toISOString(), data, source: "massive" });
    } catch (e) {
      // continue best-effort
    }
  }

  if (!rows.length) return 0;
  const { error } = await sb.from("snapshots").upsert(
    rows.map((r) => ({ symbol: r.symbol, asof: r.asof, data: r.data, source: r.source })),
    { onConflict: "symbol" }
  );
  if (error) throw error;
  return rows.length;
}
