import { describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import type { AppServices } from "../src/app";
import { createApp } from "../src/app";
import { AlertRegistry } from "../src/alerts/registry";
import { defaultStrategyParams } from "../src/config/strategy.defaults";
import type { SupabaseService } from "../src/services/supabaseService";
import type { StrategyDetectorService } from "../src/services/strategyDetector";
import type { PolygonStreamingService } from "../src/services/polygonStreamingService";
import type { WatchlistSymbol } from "../src/types";

const buildServices = (): AppServices => {
  const storage = new Map<string, WatchlistSymbol[]>();

  const supabaseService = {
    getWatchlist: jest.fn(async (userId: string) => storage.get(userId) ?? []),
    saveWatchlist: jest.fn(async (userId: string, watchlist: WatchlistSymbol[]) => {
      storage.set(userId, watchlist);
    }),
    saveSetup: jest.fn().mockResolvedValue(undefined),
    getSetups: jest.fn().mockResolvedValue([]),
    deleteSetup: jest.fn().mockResolvedValue(undefined),
  } as unknown as SupabaseService;

  const strategyDetector = {
    updateParams: jest.fn(),
    getParams: jest.fn().mockReturnValue(defaultStrategyParams),
    getActiveSetups: jest.fn().mockReturnValue([]),
    getSetupsForSymbol: jest.fn().mockReturnValue([]),
    on: jest.fn(),
    emit: jest.fn(),
  } as unknown as StrategyDetectorService;

  const polygonService = {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  } as unknown as PolygonStreamingService;

  return {
    supabaseService,
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
