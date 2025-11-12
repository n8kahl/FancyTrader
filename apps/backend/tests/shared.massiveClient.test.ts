import nock from "nock";
import { describe, it, expect, beforeAll, afterAll, afterEach, jest, vi } from "@jest/globals";
import { MassiveClient, marketToMode } from "@fancytrader/shared/client/massive";
import { HttpClient } from "@fancytrader/shared/http/client";

describe("MassiveClient", () => {
  const base = process.env.MASSIVE_REST_BASE ?? "https://api.massive.com";
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
    nock(base).get("/v1/market/status").query(true).reply(200, { market: "open" });
    const status = await createClient().getMarketStatus();
    expect(marketToMode(status)).toBe("regular");
  });

  it("retries on 429 honoring Retry-After", async () => {
    const scope = nock(base)
      .get("/v1/market/status")
      .query(true)
      .reply(429, {}, { "retry-after": "1" })
      .get("/v1/market/status")
      .query(true)
      .reply(200, { market: "closed" });

    const status = await createClient().getMarketStatus();
    expect(marketToMode(status)).toBe("closed");
    expect(scope.isDone()).toBe(true);
  });

  it("opens circuit after repeated failures and recovers", async () => {
    jest.useFakeTimers();
    const client = createClient({ maxRetries: 0 });
    const delaySpy = vi.spyOn(HttpClient.prototype as any, "delay").mockResolvedValue(undefined);
    for (let i = 0; i < 5; i += 1) {
      nock(base).get("/v1/market/status").query(true).reply(500);
    }

    try {
      for (let i = 0; i < 5; i += 1) {
        const pending = client.getMarketStatus();
        await Promise.resolve();
        jest.advanceTimersByTime(5000);
        jest.runOnlyPendingTimers();
        await expect(pending).rejects.toThrow();
      }

      await expect(client.getMarketStatus()).rejects.toThrow("CircuitOpen");

      jest.advanceTimersByTime(30_001);
      nock(base).get("/v1/market/status").query(true).reply(200, { market: "regular" });

      const status = await client.getMarketStatus();
      expect(marketToMode(status)).toBe("regular");
    } finally {
      delaySpy.mockRestore();
    }
  });
});
