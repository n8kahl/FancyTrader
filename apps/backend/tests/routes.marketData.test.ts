import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from "@jest/globals";
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
      getWatchlist: jest.fn().mockResolvedValue([]),
      saveWatchlist: jest.fn().mockResolvedValue(undefined),
      saveSetup: jest.fn().mockResolvedValue(undefined),
      getSetups: jest.fn().mockResolvedValue([]),
      deleteSetup: jest.fn().mockResolvedValue(undefined),
    } as any,
    supabaseSetups: {
      listSetups: jest.fn().mockResolvedValue([]),
      saveSetup: jest.fn().mockResolvedValue(undefined),
      deleteSetup: jest.fn().mockResolvedValue(undefined),
    } as any,
    strategyDetector: {
      updateParams: jest.fn(),
      getParams: jest.fn().mockReturnValue(defaultStrategyParams),
      getActiveSetups: jest.fn().mockReturnValue([]),
      getSetupsForSymbol: jest.fn().mockReturnValue([]),
      on: jest.fn(),
      emit: jest.fn(),
    } as any,
    polygonService: {
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
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
