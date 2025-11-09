import type { AxiosError } from "axios";
import { snapshotIndices } from "../clients/massive.js";

export type IndexSnapshot = Record<string, unknown>;

export async function getIndexSnapshots(indices: string[]): Promise<Record<string, IndexSnapshot>> {
  if (!indices?.length) return {};
  const data = await snapshotIndices(indices);

  const arr: any[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.results)
    ? (data as any).results
    : [];

  const out: Record<string, IndexSnapshot> = {};
  for (const item of arr) {
    const t =
      item?.ticker ??
      item?.symbol ??
      item?.T ??
      item?.index?.ticker ??
      item?.index?.symbol;
    if (typeof t === "string") out[t] = item;
  }
  return out;
}

export function summarizeIndexForLog(raw: any) {
  const last =
    raw?.lastTrade?.price ??
    raw?.lastTrade?.p ??
    raw?.last?.price ??
    raw?.last ??
    raw?.close;
  const prevClose =
    raw?.previousClose?.price ??
    raw?.previousClose?.p ??
    raw?.prevClose ??
    raw?.prev?.close;
  return { last, prevClose };
}

export function prettyAxiosErr(e: unknown) {
  const ax = e as AxiosError<any>;
  const status = ax?.response?.status;
  const url = (ax as any)?.config?.url;
  const params = (ax as any)?.config?.params;
  return { status, url, params, data: ax?.response?.data ?? ax?.message };
}
