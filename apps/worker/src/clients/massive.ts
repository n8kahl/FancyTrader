const MASSIVE_BASE_URL = "https://api.massive.com";
const API_KEY = process.env.MASSIVE_API_KEY || "";

if (!API_KEY) {
  console.error("MASSIVE_API_KEY is missing");
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path, MASSIVE_BASE_URL);
  const entries = Object.entries(params || {}).filter(([_, v]) => v !== undefined && v !== null);
  for (const [k, v] of entries) url.searchParams.set(k, String(v));
  url.searchParams.set("apiKey", API_KEY);
  return url;
}

async function getJson<T = any>(path: string, params?: Record<string, any>): Promise<T> {
  const url = buildUrl(path, params);
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    let body: string | undefined;
    try {
      body = await res.text();
    } catch {}
    console.error(`[massive] GET ${path} failed`, { status: res.status, body });
    throw new Error(`Massive request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function universalSnapshot(tickers: string[]) {
  return getJson("/v3/snapshot", { "ticker.any_of": tickers.join(",") });
}

export async function optionsSnapshotForUnderlying(underlying: string) {
  return getJson(`/v3/snapshot/options/${encodeURIComponent(underlying)}`);
}

export async function optionsSnapshotForContract(underlying: string, contract: string) {
  const clean = contract.startsWith("O:") ? contract.slice(2) : contract;
  return getJson(`/v3/snapshot/options/${encodeURIComponent(underlying)}/${encodeURIComponent(clean)}`);
}

export async function optionQuote(optionsTicker: string) {
  return getJson(`/v3/quotes/${encodeURIComponent(optionsTicker)}`);
}

export function logFetchError(context: string, err: any) {
  const status = err?.status || err?.response?.status;
  const data = err?.response?.data;
  console.error(`[massive] ${context} failed`, { status, data, err });
  throw err;
}
