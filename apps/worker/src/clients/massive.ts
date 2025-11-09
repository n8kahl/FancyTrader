import axios, { type AxiosError } from "axios";

const BASE_URL = (process.env.MASSIVE_BASE_URL ?? "https://api.massive.com").replace(/\/+$/, "");
const V3 = `${BASE_URL}/v3`;
const V2 = `${BASE_URL}/v2`;
const API_KEY = process.env.MASSIVE_API_KEY;
if (!API_KEY) throw new Error("MASSIVE_API_KEY is required");

function logHttpError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError;
    const urlPath = `${err.config?.baseURL ?? ""}${err.config?.url ?? ""}`;
    console.error(`[HTTP ${err.response?.status ?? "ERR"}] ${urlPath}`);
    if (err.response?.data) {
      console.error(JSON.stringify(err.response.data));
    }
    return;
  }
  console.error(String(error));
}

const httpV3 = axios.create({ baseURL: V3, params: { apiKey: API_KEY }, timeout: 10_000 });
const httpV2 = axios.create({ baseURL: V2, params: { apiKey: API_KEY }, timeout: 10_000 });

export async function snapshotIndices(symbols: string[]) {
  try {
    const { data } = await httpV3.get("/snapshot/indices", { params: { symbols: symbols.join(",") } });
    return data;
  } catch (error) {
    logHttpError(error);
    throw error;
  }
}

export async function optionChainSnapshot(underlying: string) {
  try {
    const { data } = await httpV3.get(`/snapshot/options/${encodeURIComponent(underlying)}`);
    return data;
  } catch (error) {
    logHttpError(error);
    throw error;
  }
}

export async function optionContractSnapshot(underlying: string, contract: string) {
  try {
    const { data } = await httpV3.get(
      `/snapshot/options/${encodeURIComponent(underlying)}/${encodeURIComponent(contract)}`
    );
    return data;
  } catch (error) {
    logHttpError(error);
    throw error;
  }
}

export async function optionQuote(contract: string) {
  try {
    const { data } = await httpV3.get(`/quotes/${encodeURIComponent(contract)}`);
    return data;
  } catch (error) {
    logHttpError(error);
    throw error;
  }
}

export async function indexPrevBar(symbol: string) {
  try {
    const { data } = await httpV2.get(`/aggs/ticker/${encodeURIComponent(symbol)}/prev`);
    return data;
  } catch (error) {
    logHttpError(error);
    throw error;
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

export function underlyingFromOcc(contract: string): string {
  if (!OCC_RE.test(contract)) return "";
  return contract.match(/^([A-Z]{1,6})\d{6}[CP]\d{8}$/)?.[1] ?? "";
}
