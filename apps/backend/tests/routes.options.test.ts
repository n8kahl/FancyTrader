import request from "supertest";
import nock from "nock";
import type { AppServices } from "../src/app";
import { createApp } from "../src/app";
import { AlertRegistry } from "../src/alerts/registry";
import { defaultStrategyParams } from "../src/config/strategy.defaults";
import type { SupabaseService } from "../src/services/supabaseService";
import type { StrategyDetectorService } from "../src/services/strategyDetector";
import type { PolygonStreamingService } from "../src/services/polygonStreamingService";

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

describe("options routes", () => {
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

  it("fetches option contracts with filters", async () => {
    nock(polygonApi)
      .get("/v3/reference/options/contracts")
      .query((query) =>
        query.apiKey === "test_key" &&
        query.underlying_ticker === "TSLA" &&
        query.expiration_date === "2024-03-15" &&
        query.contract_type === "call" &&
        query.strike_price === "500"
      )
      .reply(200, {
        results: [
          {
            symbol: "TSLA240315C00500000",
            expiration_date: "2024-03-15",
            contract_type: "call",
            strike_price: 500,
            last_price: 12.5,
            days_to_expiration: 20,
            greeks: { delta: 0.42 },
            break_even_price: 512.5,
            in_the_money: false,
            distance_from_underlying: 15,
          },
        ],
      });

    const res = await request(app).get(
      "/api/options/contracts/tsla?expiration=2024-03-15&type=call&strike=500"
    );

    expect(res.status).toBe(200);
    expect(res.body.underlying).toBe("TSLA");
    expect(res.body.count).toBe(1);
    expect(res.body.contracts[0]).toMatchObject({ symbol: expect.stringContaining("TSLA24") });
  });

  it("returns the option snapshot payload", async () => {
    nock(polygonApi)
      .get("/v3/snapshot/options/TSLA/TSLA240315C00500000")
      .query({ apiKey: "test_key" })
      .reply(200, {
        results: { last_quote: { bid: 10.5, ask: 10.7 } },
      });

    const res = await request(app).get(
      "/api/options/snapshot/tsla/tsla240315c00500000"
    );

    expect(res.status).toBe(200);
    expect(res.body.underlying).toBe("TSLA");
    expect(res.body.optionSymbol).toBe("TSLA240315C00500000");
    expect(res.body.data).toEqual({ last_quote: { bid: 10.5, ask: 10.7 } });
  });
});
