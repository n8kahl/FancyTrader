import type { MassiveClient } from "@fancytrader/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as massiveClientHelpers from "../src/clients/massive";
import {
  __resetMassiveClientForTests,
  __resetSupabaseClientForTests,
  __setMassiveClientForTests,
  scanLoop,
  upsertScanJob,
} from "../src/index";

const createMassiveClientMock = () => ({
  getMarketStatus: vi.fn().mockResolvedValue({ market: "open" }),
});

const rows = new Map<string, Record<string, unknown>>();

const upsertSpy = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      upsert: upsertSpy,
    }),
  }),
}));

beforeEach(() => {
  rows.clear();
  upsertSpy.mockImplementation(async (payload: any, options: any) => {
    const key = `${payload.job_name}:${payload.window_start}`;
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
  vi.restoreAllMocks();
});

describe("scan job helpers", () => {
  it("dedupes by job/window key", async () => {
    const windowStart = "2024-01-01T00:00:00Z";
    await upsertScanJob("scan_regular_SPY", windowStart, "running");
    await upsertScanJob("scan_regular_SPY", windowStart, "success");

    expect(rows.size).toBe(1);
    const stored = rows.get("scan_regular_SPY:2024-01-01T00:00:00Z");
    expect(stored?.status).toBe("success");
    expect(stored?.ended_at).toBeDefined();
  });

  it("skips live HTTP calls when closed", async () => {
    const snapshotSpy = vi
      .spyOn(massiveClientHelpers, "snapshotIndices")
      .mockResolvedValue({ symbols: [] });
    const clientMock = createMassiveClientMock();
    clientMock.getMarketStatus = vi.fn().mockResolvedValue({ market: "closed" });
    __setMassiveClientForTests(clientMock as unknown as MassiveClient);

    await scanLoop("closed");

    expect(snapshotSpy).not.toHaveBeenCalled();
    expect(rows.size).toBeGreaterThan(0);
    for (const payload of rows.values()) {
      expect(payload.status).toBe("success");
      const meta = payload.meta as { closed_mode_cached?: boolean } | undefined;
      expect(meta?.closed_mode_cached).toBe(false);
    }
  });
});
