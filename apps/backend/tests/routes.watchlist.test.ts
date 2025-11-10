import {describe, expect, it} from "vitest";
import request from "supertest";
import type { AppServices } from "../src/app";
import { createApp } from "../src/app";
import { AlertRegistry } from "../src/alerts/registry";
import { defaultStrategyParams } from "../src/config/strategy.defaults";
import type { SupabaseService } from "../src/services/supabaseService";
import type { SupabaseSetupsService } from "../src/services/supabaseSetups";
import type { StrategyDetectorService } from "../src/services/strategyDetector";
import type { PolygonStreamingService } from "../src/services/polygonStreamingService";
import type { WatchlistSymbol } from "../src/types";

const buildServices = (): AppServices => {
  const storage = new Map<string, WatchlistSymbol[]>();

  const supabaseService = {
    getWatchlist: vi.fn(async (userId: string) => storage.get(userId) ?? []),
    saveWatchlist: vi.fn(async (userId: string, watchlist: WatchlistSymbol[]) => {
      storage.set(userId, watchlist);
    }),
    saveSetup: vi.fn().mockResolvedValue(undefined),
    getSetups: vi.fn().mockResolvedValue([]),
    deleteSetup: vi.fn().mockResolvedValue(undefined),
  } as unknown as SupabaseService;

  const supabaseSetups = {
    listSetups: vi.fn().mockResolvedValue([]),
    saveSetup: vi.fn().mockResolvedValue(undefined),
    deleteSetup: vi.fn().mockResolvedValue(undefined),
  } as unknown as SupabaseSetupsService;

  const strategyDetector = {
    updateParams: vi.fn(),
    getParams: vi.fn().mockReturnValue(defaultStrategyParams),
    getActiveSetups: vi.fn().mockReturnValue([]),
    getSetupsForSymbol: vi.fn().mockReturnValue([]),
    on: vi.fn(),
    emit: vi.fn(),
  } as unknown as StrategyDetectorService;

  const polygonService = {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  } as unknown as PolygonStreamingService;

  return {
    supabaseService,
    supabaseSetups,
    strategyDetector,
    polygonService,
    alertRegistry: new AlertRegistry(),
  };
};

describe("Watchlist compatibility routes", () => {
  const userId = "test-user";

  it("adds, fetches, and removes a symbol", async () => {
    const { app } = createApp({ services: buildServices() });

    await request(app)
      .post("/api/watchlist")
      .set("x-user-id", userId)
      .send({ symbol: "AAPL" })
      .expect(200)
      .expect(({ body }) => expect(body.ok).toBe(true));

    const getRes = await request(app)
      .get("/api/watchlist")
      .set("x-user-id", userId)
      .expect(200);

    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body.some((entry: WatchlistSymbol) => entry.symbol === "AAPL")).toBe(true);

    await request(app)
      .delete("/api/watchlist/AAPL")
      .set("x-user-id", userId)
      .expect(200)
      .expect(({ body }) => expect(body.ok).toBe(true));

    const finalRes = await request(app)
      .get("/api/watchlist")
      .set("x-user-id", userId)
      .expect(200);

    expect(finalRes.body.some((entry: WatchlistSymbol) => entry.symbol === "AAPL")).toBe(false);
  });
});
