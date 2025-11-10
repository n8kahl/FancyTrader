import nock from "nock";
import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import { MassiveClient, marketToMode } from "../../packages/shared/src/client/massive";

describe("MassiveClient", () => {
  const base = "https://api.massive.com";
  const createClient = (opts = {}) => new MassiveClient({ baseUrl: base, apiKey: "test_key", ...opts });

  beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect("127.0.0.1");
  });

  afterEach(() => {
    nock.cleanAll();
    jest.useRealTimers();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  it("maps open → regular", async () => {
    nock(base).get("/v3/market/status").reply(200, { market: "open" });
    const status = await createClient().getMarketStatus();
    expect(marketToMode(status)).toBe("regular");
  });

  it("retries on 429 honoring Retry-After", async () => {
    const scope = nock(base)
      .get("/v3/market/status")
      .reply(429, {}, { "retry-after": "1" })
      .get("/v3/market/status")
      .reply(200, { market: "closed" });

    const status = await createClient().getMarketStatus();
    expect(marketToMode(status)).toBe("closed");
    expect(scope.isDone()).toBe(true);
  });

  it("opens circuit after repeated failures and recovers", async () => {
    jest.useFakeTimers();
    const client = createClient({ maxRetries: 0 });
    const failureScope = nock(base);
    for (let i = 0; i < 5; i += 1) {
      failureScope.get("/v3/market/status").reply(500);
    }

    for (let i = 0; i < 5; i += 1) {
      await expect(client.getMarketStatus()).rejects.toThrow();
    }

    await expect(client.getMarketStatus()).rejects.toThrow("CircuitOpen");

    jest.advanceTimersByTime(30_001);
    nock(base).get("/v3/market/status").reply(200, { market: "regular" });

    const status = await client.getMarketStatus();
    expect(marketToMode(status)).toBe("regular");
  });
});
