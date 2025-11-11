import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { MassiveClient, marketToMode, serverEnv } from "@fancytrader/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { snapshotIndices } from "./clients/massive.js";
import {
  jobsInflight,
  scanFailure,
  scanLatency,
  scanSuccess,
  startMetricsServer,
} from "./lib/metrics.js";
import { sendDiscordAlert } from "./lib/discord.js";
import { persistSnapshots } from "./jobs/snapshotPersist.js";

type ScanMode = ReturnType<typeof marketToMode>;
type ScanStatus = "pending" | "running" | "success" | "failed";
type ScanMeta = Record<string, unknown>;

const WATCH_SYMBOLS = (process.env.WORKER_SYMBOLS ?? "SPY,QQQ")
  .split(",")
  .map((symbol) => symbol.trim().toUpperCase())
  .filter(Boolean);

let supabase: SupabaseClient | null = null;
let massiveClient: MassiveClient = new MassiveClient();
const lastSnapshots = new Map<string, unknown>();

const getSupabaseClient = (): SupabaseClient => {
  if (supabase) return supabase;
  const url = serverEnv.SUPABASE_URL;
  const key = serverEnv.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required for the worker");
  }
  supabase = createClient(url, key, { auth: { persistSession: false } });
  return supabase;
};

export const computeWindowStart = (date = new Date()): string => {
  const copy = new Date(date);
  copy.setSeconds(0, 0);
  copy.setMilliseconds(0);
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
  const timerEnd = scanLatency.startTimer();
  jobsInflight.inc();

  try {
    if (mode === "closed") {
      const cached = lastSnapshots.has(symbol);
      await upsertScanJob(jobName, windowStart, "success", {
        mode,
        symbol,
        closed_mode_cached: cached,
      });
      scanSuccess.labels(mode).inc();
      return;
    }

    const snapshot = await snapshotIndices([symbol]);
    lastSnapshots.set(symbol, snapshot);
    await upsertScanJob(jobName, windowStart, "success", { mode, symbol });
    scanSuccess.labels(mode).inc();
  } catch (error: unknown) {
    await upsertScanJob(jobName, windowStart, "failed", {
      mode,
      symbol,
      error: error instanceof Error ? error.message : String(error),
    });
    scanFailure.labels(mode).inc();
  } finally {
    jobsInflight.dec();
    timerEnd();
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
  const metricsPort = Number(process.env.WORKER_METRICS_PORT ?? 0);
  if (metricsPort) {
    startMetricsServer(metricsPort);
  }
  const mode = await resolveCurrentMode();
  await sendDiscordAlert({
    enabled: serverEnv.DISCORD_ENABLED,
    url: serverEnv.DISCORD_WEBHOOK_URL,
    kind: "SESSION_TRANSITION",
    title: "Market session detected",
    fields: { mode },
  });
  await scanLoop(mode);

  if (mode === "closed" || mode === "premarket") {
    const wrote = await persistSnapshots(WATCH_SYMBOLS);
    await sendDiscordAlert({
      enabled: serverEnv.DISCORD_ENABLED,
      url: serverEnv.DISCORD_WEBHOOK_URL,
      kind: "SCANNER_HEALTH",
      title: "Snapshots persisted",
      fields: { symbols: WATCH_SYMBOLS.length, rows: wrote, mode },
    });
  }
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

const isDirectRun =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectRun) {
  main().catch(async (error) => {
    await sendDiscordAlert({
      enabled: serverEnv.DISCORD_ENABLED,
      url: serverEnv.DISCORD_WEBHOOK_URL,
      kind: "ERROR",
      title: "Worker scan failed",
      fields: { message: error instanceof Error ? error.message : String(error) },
    });
    console.error("Worker failed", error);
    process.exit(1);
  });
}
