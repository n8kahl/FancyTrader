import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

export const snapshotsRouter = Router();

snapshotsRouter.get("/", async (req, res) => {
  const symbols = String(req.query.symbol || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!symbols.length) {
    return res.status(400).json({ error: "symbol query required" });
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!(url && key)) {
    return res.status(500).json({ error: "supabase not configured" });
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("snapshots")
    .select("symbol,asof,data,source")
    .in("symbol", symbols);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  const map: Record<string, { asof: string; data: unknown; source: string }> = {};
  for (const row of data || []) {
    map[row.symbol] = { asof: row.asof, data: row.data, source: row.source };
  }
  res.json({ snapshots: map });
});
