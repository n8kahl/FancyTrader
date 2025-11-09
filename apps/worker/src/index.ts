import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { massiveClient } from "../../backend/src/services/polygonClient";

type ScanMode = "premarket" | "regular" | "aftermarket" | "closed";
type ScanStatus = "pending" | "running" | "success" | "failed";

type ScanMeta = Record<string, unknown>;

const WATCH_SYMBOLS = (process.env.WORKER_SYMBOLS ?? "AAPL,MSFT")
  .split(",")
  .map((symbol) => symbol.trim().toUpperCase())
  .filter(Boolean);

let supabase: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
  if (supabase) {
    return supabase;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required for the worker");
  }

  supabase = createClient(url, key, { auth: { persistSession: false } });
  return supabase;
};

export const computeWindowStart = (date = new Date()): string => {
  const copy = new Date(date);
  copy.setSeconds(0, 0);
  return copy.toISOString();
};

const rangeForMinutes = (minutes: number) => {
  const end = new Date();
  const start = new Date(end.getTime() - minutes * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
};

export async function upsertScanJob(
  jobName: string,
  windowStart: string,
  status: ScanStatus,
  meta: ScanMeta = {}
): Promise<void> {
  const client = getSupabaseClient();
  const timestamp = new Date().toISOString();
  const payload: Record<string, unknown> = {
    job_name: jobName,
    window_start: windowStart,
    status,
    attempt: 1,
    meta,
  };

  if (status === "running") {
    payload.started_at = timestamp;
  }

  if (status === "success" || status === "failed") {
    payload.ended_at = timestamp;
  }

  const { error } = await client
    .from("scan_jobs")
    .upsert(payload, { onConflict: "job_name,window_start" });

  if (error) {
    throw error;
  }
}

async function scanSymbol(mode: ScanMode, symbol: string): Promise<void> {
  const windowStart = computeWindowStart();
  const jobName = `scan_${mode}_${symbol}`;
  await upsertScanJob(jobName, windowStart, "running", { mode, symbol });

  try {
    if (mode === "closed") {
      await massiveClient.getPreviousClose(symbol);
    } else {
      const { start, end } = rangeForMinutes(30);
      await massiveClient.getAggregates(symbol, 1, "minute", start, end, 300);
    }
    await upsertScanJob(jobName, windowStart, "success", { mode, symbol });
  } catch (error) {
    await upsertScanJob(jobName, windowStart, "failed", {
      mode,
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function scanLoop(mode: ScanMode): Promise<void> {
  for (const symbol of WATCH_SYMBOLS) {
    await scanSymbol(mode, symbol);
  }
}

export async function resolveCurrentMode(): Promise<ScanMode> {
  const raw = (await massiveClient.getMarketStatus()) as Record<string, unknown>;
  const market = String(raw?.market ?? "").toLowerCase();
  if (market.includes("pre")) return "premarket";
  if (market.includes("after")) return "aftermarket";
  if (market.includes("open")) return "regular";
  return "closed";
}

export async function main(): Promise<void> {
  const mode = await resolveCurrentMode();
  await scanLoop(mode);
}

export const __resetSupabaseClientForTests = (): void => {
  supabase = null;
};

if (require.main === module) {
  main().catch((error) => {
    console.error("Worker failed", error);
    process.exit(1);
  });
}

export { WATCH_SYMBOLS };