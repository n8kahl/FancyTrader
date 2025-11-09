import nock from "nock";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "@jest/globals";
import { MassiveClient, marketToMode } from "../../packages/shared/src/client/massive";

describe("MassiveClient basic smoke", () => {
  const base = "https://api.massive.com";
  const client = new MassiveClient({ baseUrl: base, apiKey: "test_key" });

  beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect("127.0.0.1");
  });

  afterEach(() => nock.cleanAll());
  afterAll(() => nock.enableNetConnect());

  it("fetches market status and maps session", async () => {
    nock(base)
      .get("/v1/marketstatus/now")
      .query({ apiKey: "test_key" })
      .reply(200, { market: "open" });

    const status = await client.getMarketStatus();
    expect(marketToMode(status)).toBe("regular");
  });

  it("retries on 429", async () => {
    const scope = nock(base)
      .get("/v1/marketstatus/now")
      .query(true)
      .reply(429, {}, { "Retry-After": "1" })
      .get("/v1/marketstatus/now")
      .query(true)
      .reply(200, { market: "closed" });

    const status = await client.getMarketStatus();
    expect(marketToMode(status)).toBe("closed");
    expect(scope.isDone()).toBe(true);
  });
});
