import axios, { AxiosError } from "axios";

const BASE_URL = "https://api.massive.com/v3";
const API_KEY = process.env.MASSIVE_API_KEY!;
if (!API_KEY) throw new Error("Missing MASSIVE_API_KEY env var");

const http = axios.create({
  baseURL: BASE_URL,
  params: { apiKey: API_KEY },
  timeout: 15000,
});

async function get<T = unknown>(path: string, params?: Record<string, any>, tries = 3, delayMs = 500): Promise<T> {
  try {
    const { data } = await http.get<T>(path, { params });
    return data;
  } catch (e) {
    const err = e as AxiosError<any>;
    const status = err.response?.status;
    const q = new URLSearchParams({ ...(params ?? {}), apiKey: "<redacted>" }).toString();
    const full = `${BASE_URL}${path}?${q}`;
    if (status && (status === 403 || status === 404)) {
      console.error(`[HTTP ${status}] ${full}`);
      throw err;
    }
    if (tries > 1) {
      await new Promise((r) => setTimeout(r, delayMs));
      return get<T>(path, params, tries - 1, Math.min(delayMs * 2, 4000));
    }
    console.error(`[HTTP ${status ?? "ERR"}] ${full}`, err.message);
    throw err;
  }
}

export async function snapshotIndices(tickers: string[]) {
  return get("/snapshot/indices", { "ticker.any_of": tickers.join(",") });
}

export async function optionChainSnapshot(underlying: string) {
  const u = encodeURIComponent(underlying);
  return get(`/snapshot/options/${u}`);
}

export async function optionContractSnapshot(underlying: string, contract: string) {
  const u = encodeURIComponent(underlying);
  const c = encodeURIComponent(contract);
  return get(`/snapshot/options/${u}/${c}`);
}

export async function indexAggsDaily(ticker: string, fromISO: string, toISO: string) {
  const t = encodeURIComponent(ticker);
  return get(`/aggs/ticker/${t}/range/1/day/${fromISO}/${toISO}`, { market: "indices" });
}

export const isIndex = (s: string) => s.startsWith("I:");
export const isOccOption = (s: string) => /^[A-Z]{1,6}\d{6}[CP]\d{8}$/.test(s);
export const underlyingFromOcc = (s: string) => s.match(/^([A-Z]{1,6})\d{6}[CP]\d{8}$/)?.[1] ?? "";
