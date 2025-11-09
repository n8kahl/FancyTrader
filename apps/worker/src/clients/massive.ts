import axios, { AxiosError } from "axios";

const V3 = "https://api.massive.com/v3";
const V2 = "https://api.massive.com/v2";
const API_KEY = process.env.MASSIVE_API_KEY!;
if (!API_KEY) throw new Error("MASSIVE_API_KEY is required");

function logHttpError(e: unknown) {
  if (axios.isAxiosError(e)) {
    const err = e as AxiosError<any>;
    const base = err.config?.baseURL ?? "";
    const urlPath = err.config?.url ?? "";
    const params = err.config?.params ? `?${new URLSearchParams(err.config.params as any)}` : "";
    console.error(`[HTTP ${err.response?.status ?? "ERR"}] ${base}${urlPath}${params}`);
    if (err.response?.data) {
      console.error(JSON.stringify(err.response.data));
    }
  } else {
    console.error(e);
  }
}

const httpV3 = axios.create({
  baseURL: V3,
  params: { apiKey: API_KEY },
  timeout: 15000,
});

const httpV2 = axios.create({
  baseURL: V2,
  params: { apiKey: API_KEY },
  timeout: 15000,
});

export async function snapshotIndices(tickers: string[]) {
  try {
    const { data } = await httpV3.get("/snapshot/indices", {
      params: { "ticker.any_of": tickers.join(",") },
    });
    return data;
  } catch (e) {
    logHttpError(e);
    throw e;
  }
}

export async function indexPrevBar(ticker: string) {
  try {
    const { data } = await httpV2.get(`/aggs/ticker/${encodeURIComponent(ticker)}/prev`);
    return data;
  } catch (e) {
    logHttpError(e);
    throw e;
  }
}

export async function indexAggsDaily(ticker: string, fromISO: string, toISO: string) {
  try {
    const { data } = await httpV2.get(
      `/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${fromISO}/${toISO}`
    );
    return data;
  } catch (e) {
    logHttpError(e);
    throw e;
  }
}

export async function optionContractSnapshot(underlying: string, contract: string) {
  try {
    const { data } = await httpV3.get(
      `/snapshot/options/${encodeURIComponent(underlying)}/${encodeURIComponent(contract)}`
    );
    return data;
  } catch (e) {
    logHttpError(e);
    throw e;
  }
}

export async function optionQuote(contract: string) {
  try {
    const { data } = await httpV3.get(`/quotes/${encodeURIComponent(contract)}`);
    return data;
  } catch (e) {
    logHttpError(e);
    throw e;
  }
}

const OCC_RE = /^[A-Z]{1,6}\d{6}[CP]\d{8}$/;

export function parseOccExpiry(contract: string): Date | null {
  if (!OCC_RE.test(contract)) return null;
  const year = Number(`20${contract.slice(3, 5)}`);
  const month = Number(contract.slice(5, 7)) - 1;
  const day = Number(contract.slice(7, 9));
  return new Date(Date.UTC(year, month, day));
}

export function isExpiredOcc(contract: string, now = new Date()): boolean {
  const exp = parseOccExpiry(contract);
  return exp ? now.getTime() > exp.getTime() + 24 * 3600 * 1000 : false;
}

export const underlyingFromOcc = (contract: string): string =>
  (OCC_RE.test(contract) ? contract.match(/^([A-Z]{1,6})\d{6}[CP]\d{8}$/)?.[1] ?? "" : "");
