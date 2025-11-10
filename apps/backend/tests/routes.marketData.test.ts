import {afterAll, afterEach, beforeAll, describe, expect, it} from "vitest";
import request from "supertest";
import nock from "nock";
import type { AppServices } from "../src/app";
import { createApp } from "../src/app";
import { AlertRegistry } from "../src/alerts/registry";
import { defaultStrategyParams } from "../src/config/strategy.defaults";

describe("marketData routes", () => {
  process.env.MASSIVE_API_KEY = "test_key";
  const services: AppServices = {
    supabaseService: {
      getWatchlist: vi.fn().mockResolvedValue([]),
      saveWatchlist: vi.fn().mockResolvedValue(undefined),
      saveSetup: vi.fn().mockResolvedValue(undefined),
      getSetups: vi.fn().mockResolvedValue([]),
      deleteSetup: vi.fn().mockResolvedValue(undefined),
    } as any,
    supabaseSetups: {
      listSetups: vi.fn().mockResolvedValue([]),
      saveSetup: vi.fn().mockResolvedValue(undefined),
      deleteSetup: vi.fn().mockResolvedValue(undefined),
    } as any,
    strategyDetector: {
      updateParams: vi.fn(),
      getParams: vi.fn().mockReturnValue(defaultStrategyParams),
      getActiveSetups: vi.fn().mockReturnValue([]),
      getSetupsForSymbol: vi.fn().mockReturnValue([]),
      on: vi.fn(),
      emit: vi.fn(),
    } as any,
    polygonService: {
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    } as any,
    alertRegistry: new AlertRegistry(),
  };

  const { app } = createApp({ services });
  const base = "https://api.massive.com";

  beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect("127.0.0.1");
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  it("returns normalized market status", async () => {
    nock(base)
      .get("/v3/market/status")
      .reply(200, { market: "after", next_open: "2024-05-02T13:30:00Z", next_close: "2024-05-02T20:00:00Z" });

    const res = await request(app).get("/api/market/status");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      session: "aftermarket",
      nextOpen: "2024-05-02T13:30:00Z",
      nextClose: "2024-05-02T20:00:00Z",
      source: "massive",
    });
  });

  it("derives the previous close from minute aggs", async () => {
    nock(base)
      .get(/\/v2\/aggs\/ticker\/SPY\/range\/1\/minute\/.*\/.*$/)
      .query((query) => query.sort === "asc" && query.limit === "5000")
      .reply(200, {
        results: [
          { t: 1, o: 100, h: 101, l: 99.5, c: 100.5, v: 1000 },
          { t: 2, o: 101, h: 102, l: 100.5, c: 101.5, v: 1200 },
        ],
      });

    const res = await request(app).get("/api/market/previous-close/spy");

    expect(res.status).toBe(200);
    expect(res.body.symbol).toBe("SPY");
    expect(res.body.data).toEqual({ t: 2, o: 101, h: 102, l: 100.5, c: 101.5, v: 1200 });
  });
});
