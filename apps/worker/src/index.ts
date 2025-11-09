import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { MassiveClient, marketToMode } from "@fancytrader/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  indexAggsDaily,
  isIndex,
  isOccOption,
  optionContractSnapshot,
  snapshotIndices,
  underlyingFromOcc,
} from "./clients/massive.js";

type ScanMode = "premarket" | "regular" | "aftermarket" | "closed";
type ScanStatus = "pending" | "running" | "success" | "failed";

type ScanMeta = Record<string, unknown>;

const log = (...args: any[]) => console.log("[worker]", ...args);

let massiveClient: MassiveClient = new MassiveClient();

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
      if (isIndex(symbol)) {
        await snapshotIndices([symbol]);
        const today = new Date().toISOString().slice(0, 10);
        await indexAggsDaily(symbol, today, today);
      } else if (isOccOption(symbol)) {
        const underlying = underlyingFromOcc(symbol);
        if (!underlying) throw new Error("Invalid option ticker");
        await optionContractSnapshot(underlying, symbol);
      } else {
        throw new Error(`Unsupported ticker format: ${symbol}`);
      }
    } else {
      const aggs = await massiveClient.getMinuteAggs(symbol, 30);
      // TODO: compute & store setups from 'aggs'
    }

    await upsertScanJob(jobName, windowStart, "success", { mode, symbol });
    log({ jobName, status: "success" });
  } catch (error: any) {
    await upsertScanJob(jobName, windowStart, "failed", {
      mode,
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error({ jobName, err: String(error?.message ?? error) });
  }
}

export async function scanLoop(mode: ScanMode): Promise<void> {
  for (const symbol of WATCH_SYMBOLS) {
    await scanSymbol(mode, symbol);
  }
}

export async function resolveCurrentMode(): Promise<ScanMode> {
  const raw = await massiveClient.getMarketStatus();
  return marketToMode(raw);
}

export async function main(): Promise<void> {
  const mode = await resolveCurrentMode();
  await scanLoop(mode);
}

export const __setMassiveClientForTests = (client: MassiveClient): void => {
  massiveClient = client;
};

export const __resetMassiveClientForTests = (): void => {
  massiveClient = new MassiveClient();
};

export const __resetSupabaseClientForTests = (): void => {
  supabase = null;
};

const isDirectRun = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  : false;

if (isDirectRun) {
  main().catch((error) => {
    console.error("Worker failed", error);
    process.exit(1);
  });
}

export { WATCH_SYMBOLS };
