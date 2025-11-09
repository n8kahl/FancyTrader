import axios, { type AxiosInstance, type AxiosError } from "axios";
import { scanFailure } from "../lib/metrics.js";

const BASE_URL = (process.env.MASSIVE_BASE_URL ?? "https://api.massive.com").replace(/\/+$/, "");
const API_URL_V3 = `${BASE_URL}/v3`;
const API_URL_V2 = `${BASE_URL}/v2`;

export class NotConfiguredError extends Error {
  constructor(message = "MASSIVE_API_KEY not configured") {
    super(message);
    this.name = "NotConfiguredError";
  }
}

let httpV3: AxiosInstance | null = null;
let httpV2: AxiosInstance | null = null;

function ensureHttpV3(): AxiosInstance {
  if (httpV3) return httpV3;
  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) throw new NotConfiguredError();
  httpV3 = axios.create({
    baseURL: API_URL_V3,
    params: { apiKey },
    timeout: 10_000,
  });
  return httpV3;
}

function ensureHttpV2(): AxiosInstance {
  if (httpV2) return httpV2;
  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) throw new NotConfiguredError();
  httpV2 = axios.create({
    baseURL: API_URL_V2,
    params: { apiKey },
    timeout: 10_000,
  });
  return httpV2;
}

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

const onNotConfigured = (label: string): void => {
  console.warn(`Massive not configured; skipping ${label}`);
  scanFailure?.labels?.("config")?.inc?.();
};

async function withMassive<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    if ((error as Error).name === "NotConfiguredError") {
      onNotConfigured(label);
      return undefined;
    }
    throw error;
  }
}

export async function snapshotIndices(symbols: string[]) {
  return withMassive("snapshotIndices", async () => {
    const { data } = await ensureHttpV3().get("/snapshot/indices", {
      params: { symbols: symbols.join(",") },
    });
    return data;
  });
}

export async function optionChainSnapshot(underlying: string) {
  return withMassive("optionChainSnapshot", async () => {
    const { data } = await ensureHttpV3().get(`/snapshot/options/${encodeURIComponent(underlying)}`);
    return data;
  });
}

export async function optionContractSnapshot(underlying: string, contract: string) {
  return withMassive("optionContractSnapshot", async () => {
    const { data } = await ensureHttpV3().get(
      `/snapshot/options/${encodeURIComponent(underlying)}/${encodeURIComponent(contract)}`
    );
    return data;
  });
}

export async function optionQuote(contract: string) {
  return withMassive("optionQuote", async () => {
    const { data } = await ensureHttpV3().get(`/quotes/${encodeURIComponent(contract)}`);
    return data;
  });
}

export async function indexPrevBar(symbol: string) {
  return withMassive("indexPrevBar", async () => {
    const { data } = await ensureHttpV2().get(`/aggs/ticker/${encodeURIComponent(symbol)}/prev`);
    return data;
  });
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
