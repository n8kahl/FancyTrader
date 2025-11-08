import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import nock from "nock";
import type { AppServices } from "../src/app";
import { createApp } from "../src/app";
import { AlertRegistry } from "../src/alerts/registry";
import { defaultStrategyParams } from "../src/config/strategy.defaults";
import type { SupabaseService } from "../src/services/supabaseService";
import type { StrategyDetectorService } from "../src/services/strategyDetector";
import type { PolygonStreamingService } from "../src/services/polygonStreamingService";
import { PolygonClient } from "../src/services/polygonClient";

const buildMockServices = (): AppServices => {
  const supabaseService = {
    getWatchlist: jest.fn().mockResolvedValue([]),
    saveWatchlist: jest.fn().mockResolvedValue(undefined),
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

describe("market + options routes", () => {
  const polygonApi = "https://api.polygon.io";
  const services = buildMockServices();
  const { app } = createApp({ services });

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

  it("returns the Polygon market status payload", async () => {
    nock(polygonApi)
      .get("/v1/marketstatus/now")
      .query({ apiKey: "test_key" })
      .reply(200, { market: "open", serverTime: "2024-05-01T14:00:00Z" });

    const res = await request(app).get("/api/market/status");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ market: "open", serverTime: "2024-05-01T14:00:00Z" });
  });

  it("normalizes snapshot responses", async () => {
    const snapshot = {
      ticker: {
        ticker: "SPY",
        lastTrade: { p: 501.25, s: 10 },
        todaysChange: -1.2,
      },
    };

    nock(polygonApi)
      .get("/v2/snapshot/locale/us/markets/stocks/tickers/SPY")
      .query({ apiKey: "test_key" })
      .reply(200, snapshot);

    const res = await request(app).get("/api/market/snapshot/spy");

    expect(res.status).toBe(200);
    expect(res.body.symbol).toBe("SPY");
    expect(res.body.data).toEqual(snapshot.ticker);
  });

  it("stitches together the options chain response", async () => {
    const expiration = "2024-12-20";

    nock(polygonApi)
      .get("/v3/reference/options/contracts")
      .query((query) =>
        query.apiKey === "test_key" &&
        query.underlying_ticker === "SPY" &&
        query.contract_type === "call" &&
        query.expiration_date === expiration
      )
      .reply(200, {
        results: [
          {
            symbol: "SPY241220C00450000",
            expiration_date: expiration,
            contract_type: "call",
            strike_price: 450,
            last_price: 3.5,
            days_to_expiration: 30,
            greeks: { delta: 0.55 },
            break_even_price: 453.5,
            in_the_money: false,
            distance_from_underlying: 5,
          },
        ],
      });

    nock(polygonApi)
      .get("/v3/reference/options/contracts")
      .query((query) =>
        query.apiKey === "test_key" &&
        query.underlying_ticker === "SPY" &&
        query.contract_type === "put" &&
        query.expiration_date === expiration
      )
      .reply(200, {
        results: [
          {
            symbol: "SPY241220P00450000",
            expiration_date: expiration,
            contract_type: "put",
            strike_price: 450,
            last_price: 4.2,
            days_to_expiration: 30,
            greeks: { delta: -0.45 },
            break_even_price: 445.8,
            in_the_money: false,
            distance_from_underlying: -5,
          },
        ],
      });

    const res = await request(app).get(`/api/options/chain/SPY?expiration=${expiration}`);

    expect(res.status).toBe(200);
    expect(res.body.underlying).toBe("SPY");
    expect(res.body.expiration).toBe(expiration);
    expect(res.body.totalContracts).toBe(2);
    expect(res.body.calls[0]).toMatchObject({
      type: "CALL",
      strike: 450,
      delta: 0.55,
    });
    expect(res.body.puts[0]).toMatchObject({
      type: "PUT",
      strike: 450,
      delta: -0.45,
    });
  });

  it("streams aggregate bars for the requested symbol", async () => {
    nock(polygonApi)
      .get("/v2/aggs/ticker/SPY/range/1/minute/2024-01-01/2024-01-02")
      .query((query) =>
        query.apiKey === "test_key" &&
        query.adjusted === "true" &&
        query.sort === "asc" &&
        query.limit === "10"
      )
      .reply(200, {
        results: [
          { t: 1, o: 100, h: 101, l: 99.5, c: 100.5, v: 1_000 },
          { t: 2, o: 101, h: 102, l: 100.5, c: 101.5, v: 1_200 },
        ],
      });

    const res = await request(app).get(
      "/api/market/bars/SPY?multiplier=1&timespan=minute&from=2024-01-01&to=2024-01-02&limit=10"
    );

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.timeframe).toBe("1minute");
    expect(res.body.bars[0]).toMatchObject({ open: 100, close: 100.5 });
  });

  it("surfaces previous close data and returns 404 when missing", async () => {
    nock(polygonApi)
      .get("/v2/aggs/ticker/QQQ/prev")
      .query({ apiKey: "test_key" })
      .reply(200, { results: [{ t: 1, o: 10, h: 11, l: 9.5, c: 10.5, v: 500 }] });

    const ok = await request(app).get("/api/market/previous-close/qqq");
    expect(ok.status).toBe(200);
    expect(ok.body.symbol).toBe("QQQ");

    nock(polygonApi)
      .get("/v2/aggs/ticker/QQQ/prev")
      .query({ apiKey: "test_key" })
      .reply(200, { results: [] });

    const missing = await request(app).get("/api/market/previous-close/qqq");
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: "Previous close data not found" });
  });

  it("paginates options contracts via the cursor endpoint", async () => {
    const listSpy = jest
      .spyOn(PolygonClient.prototype as unknown as { listOptionsContractsPaged: jest.Mock }, "listOptionsContractsPaged")
      .mockResolvedValue({
        items: [
          { symbol: "SPY240118C00450000", expiration: "2024-01-18", type: "CALL" },
          { symbol: "SPY240118P00450000", expiration: "2024-01-18", type: "PUT" },
        ],
        nextCursor: "opaque",
      });

    const res = await request(app).get("/api/market-data/options/contracts?underlying=spy");

    expect(res.status).toBe(200);
    expect(listSpy).toHaveBeenCalledWith("SPY", undefined);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.nextCursor).toBe("opaque");

    listSpy.mockRestore();
  });

  it("returns 400 when the cursor cannot be decoded", async () => {
    const listSpy = jest
      .spyOn(PolygonClient.prototype as unknown as { listOptionsContractsPaged: jest.Mock }, "listOptionsContractsPaged")
      .mockRejectedValue(new Error("INVALID_CURSOR"));

    const res = await request(app).get(
      "/api/market-data/options/contracts?underlying=spy&cursor=opaque"
    );

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_CURSOR");
    listSpy.mockRestore();
  });
});
