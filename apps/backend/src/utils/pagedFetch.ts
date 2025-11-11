import axios from "axios";
import { setTimeout as sleep } from "node:timers/promises";
import { incMassiveRest } from "./metrics.js";

export interface PageShape<T> {
  results: T[];
  next_url?: string | null;
}

interface FollowOptions {
  maxPages?: number;
  sleepMs?: number;
}

interface FollowResult<T> {
  items: T[];
  lastUrl?: string | null;
}

const DEFAULT_BACKOFFS_MS = [1_000, 2_000, 4_000, 8_000, 16_000];

export async function followNextUrls<T, R>(
  firstUrl: string,
  headers: Record<string, string>,
  parsePage: (_payload: unknown) => PageShape<R>,
  mapItem: (_record: R) => T,
  opts?: FollowOptions
): Promise<FollowResult<T>> {
  const items: T[] = [];
  let nextUrl: string | undefined | null = firstUrl;
  let lastUrl: string | undefined | null;
  let pageCount = 0;

  const backoffs =
    opts?.sleepMs && opts.sleepMs > 0
      ? [opts.sleepMs, ...DEFAULT_BACKOFFS_MS.slice(1)]
      : DEFAULT_BACKOFFS_MS;

  while (nextUrl) {
    if (opts?.maxPages && pageCount >= opts.maxPages) break;

    const data = await fetchWithBackoff(nextUrl, headers, backoffs);
    const page = parsePage(data);

    page.results.forEach((record) => items.push(mapItem(record)));

    lastUrl = page.next_url ?? null;
    nextUrl = page.next_url ?? null;
    pageCount += 1;
  }

  return { items, lastUrl };
}

async function fetchWithBackoff(
  url: string,
  headers: Record<string, string>,
  backoffs: number[]
): Promise<unknown> {
  let attempt = 0;

  while (true) {
    try {
      const response = await axios.get(url, {
        headers,
        validateStatus: () => true,
      });
      const ok = response.status >= 200 && response.status < 300;
      incMassiveRest(ok, response.status);

      if (response.status === 429) {
        const retryAfter = Number(response.headers["retry-after"]);
        const delay = Number.isFinite(retryAfter)
          ? retryAfter * 1_000
          : backoffs[Math.min(attempt, backoffs.length - 1)];
        attempt += 1;
        await sleep(delay);
        continue;
      }

      if (!ok) {
        const body = typeof response.data === "string" ? response.data : JSON.stringify(response.data ?? {});
        throw new Error(`Upstream request failed (${response.status}): ${body}`);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        incMassiveRest(false, error.response?.status);
      } else {
        incMassiveRest(false);
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}

export function encodeCursor(url?: string | null): string | undefined {
  if (!url) return undefined;
  return Buffer.from(url, "utf8").toString("base64url");
}

export function decodeCursor(cursor?: string): string | undefined {
  if (!cursor) return undefined;
  try {
    return Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    return undefined;
  }
}
