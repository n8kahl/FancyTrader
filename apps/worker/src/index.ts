import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { MassiveClient, marketToMode } from "@fancytrader/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  indexPrevBar,
  isExpiredOcc,
  optionChainSnapshot,
  optionContractSnapshot,
  optionQuote,
  snapshotIndices,
  underlyingFromOcc,
} from "./clients/massive.js";
import {
  getIndexSnapshots,
  prettyAxiosErr,
  summarizeIndexForLog,
} from "./jobs/indexSnapshot.js";
import { smokeOption } from "./jobs/smokeOption.js";
import { classify } from "./lib/tickers.js";

type ScanMode = "premarket" | "regular" | "aftermarket" | "closed";
type ScanStatus = "pending" | "running" | "success" | "failed";

type ScanMeta = Record<string, unknown>;

const log = (...args: any[]) => console.log("[worker]", ...args);

let massiveClient: MassiveClient = new MassiveClient();
let INDICES_CACHE: Record<string, Record<string, unknown>> = {};

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
      const kind = classify(symbol);
      if (kind === "index") {
        const cached = INDICES_CACHE[symbol];
        if (cached) {
          log("[worker] index cache hit", symbol, summarizeIndexForLog(cached));
        } else {
          await snapshotIndices([symbol]);
        }
        await indexPrevBar(symbol);
      } else if (kind === "option_contract") {
        if (isExpiredOcc(symbol)) {
          console.warn(`Skipping expired options contract: ${symbol}`);
        } else {
          const underlying = underlyingFromOcc(symbol);
          if (!underlying) throw new Error("Invalid option ticker");
          try {
            await optionContractSnapshot(underlying, symbol);
          } catch (err) {
            console.warn(`snapshot failed for ${symbol}`, err instanceof Error ? err.message : err);
            await optionQuote(symbol);
          }
        }
      } else if (kind === "option_underlying") {
        await optionChainSnapshot(symbol);
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
  const indicesEnv = process.env.INDICES || "I:SPX,I:NDX";
  const indices = indicesEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (indices.length) {
    try {
      INDICES_CACHE = await getIndexSnapshots(indices);
      const preview = Object.entries(INDICES_CACHE)
        .slice(0, 3)
        .map(([t, snap]) => [t, summarizeIndexForLog(snap)]);
      console.log("[worker] indices snapshot OK", preview);
    } catch (e) {
      console.error("[worker] indices snapshot FAILED", prettyAxiosErr(e));
      INDICES_CACHE = {};
    }
  }

  const smoke = process.env.OPTION_CONTRACT_SMOKE;
  if (smoke) {
    try {
      await smokeOption(smoke.trim());
    } catch (e) {
      console.error("[worker] smokeOption error", e);
    }
  }

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
