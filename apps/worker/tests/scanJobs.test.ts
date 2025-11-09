import type { MassiveClient } from "@fancytrader/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetMassiveClientForTests,
  __resetSupabaseClientForTests,
  __setMassiveClientForTests,
  upsertScanJob,
} from "../src/index";

const createMassiveClientMock = () => ({
  getMarketStatus: vi.fn().mockResolvedValue({ market: "open" }),
  getMinuteAggs: vi.fn().mockResolvedValue([]),
  getTickerSnapshot: vi.fn().mockResolvedValue({}),
});

const rows = new Map<string, Record<string, unknown>>();
const upsertSpy = vi.fn();

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: () => ({
      from: () => ({
        upsert: upsertSpy,
      }),
    }),
  };
});

beforeEach(() => {
  rows.clear();
  upsertSpy.mockImplementation(async (payload: any, options: any) => {
    const key = payload.job_name + ":" + payload.window_start;
    rows.set(key, { ...payload });
    expect(options?.onConflict).toBe("job_name,window_start");
    return { error: null };
  });
  process.env.SUPABASE_URL = "http://localhost:54321";
  process.env.SUPABASE_SERVICE_KEY = "service-role";
  __resetSupabaseClientForTests();
  const mock = createMassiveClientMock();
  __setMassiveClientForTests(mock as unknown as MassiveClient);
});

afterEach(() => {
  __resetMassiveClientForTests();
});

describe("scan job upserts", () => {
  it("dedupes by job/window key", async () => {
    const windowStart = "2024-01-01T00:00:00Z";
    await upsertScanJob("scan_regular_AAPL", windowStart, "running");
    await upsertScanJob("scan_regular_AAPL", windowStart, "success");

    expect(rows.size).toBe(1);
    const stored = rows.get("scan_regular_AAPL:2024-01-01T00:00:00Z");
    expect(stored?.status).toBe("success");
    expect(stored?.ended_at).toBeDefined();
  });
});
