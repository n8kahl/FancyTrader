import axios from "axios";
import { Config } from "../config.js";

const { massive, timeouts } = Config;
const BASE = massive.restBase;
const KEY = massive.apiKey;
const MODE = massive.authMode;

if (!KEY) {
  throw new Error("MASSIVE_API_KEY is required");
}

function withAuth(url: string) {
  if (MODE === "header") {
    return { url, headers: { "x-api-key": KEY } as Record<string, string> };
  }
  const sep = url.includes("?") ? "&" : "?";
  return { url: `${url}${sep}apiKey=${encodeURIComponent(KEY)}`, headers: {} as Record<string, string> };
}

export async function getMarketStatusNow(): Promise<any> {
  const { url, headers } = withAuth(`${BASE}/v1/marketstatus/now`);
  const { data } = await axios.get(url, { headers, timeout: timeouts.http });
  return data;
}

export async function getUpcomingCalendar(): Promise<any[]> {
  const { url, headers } = withAuth(`${BASE}/v1/marketstatus/upcoming`);
  const { data } = await axios.get(url, { headers, timeout: timeouts.http });
  return Array.isArray(data) ? data : [];
}

export function normalizeSession(market: string | undefined): "early_trading" | "open" | "late_trading" | "closed" {
  const m = (market || "").toLowerCase();
  if (m.includes("pre") || m.includes("early")) return "early_trading";
  if (m === "open") return "open";
  if (m.includes("after") || m.includes("late")) return "late_trading";
  return "closed";
}

export function computeNextTimes(upcoming: any[], nowIso: string) {
  const now = new Date(nowIso).getTime();
  const preferred = new Set(["NYSE", "NASDAQ", "Nasdaq"]);
  let nextOpen: string | null = null;
  let nextClose: string | null = null;

  for (const ev of upcoming) {
    const exch = String(ev.exchange || "").toUpperCase();
    if (!preferred.has(exch)) continue;
    const open = ev.open ? new Date(ev.open).getTime() : NaN;
    const close = ev.close ? new Date(ev.close).getTime() : NaN;
    if (!Number.isNaN(open) && open > now && !nextOpen) {
      nextOpen = new Date(open).toISOString();
    }
    if (!Number.isNaN(close) && close > now && !nextClose) {
      nextClose = new Date(close).toISOString();
    }
    if (nextOpen && nextClose) break;
  }
  return { nextOpen, nextClose };
}
