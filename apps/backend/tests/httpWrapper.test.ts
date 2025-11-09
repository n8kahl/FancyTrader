import { describe, expect, it, afterEach } from "@jest/globals";
import nock from "nock";
import { HttpClient } from "../src/utils/http";

const HOST = "https://api.massive.com";

describe("HttpClient", () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it("retries retriable responses and eventually resolves", async () => {
    nock(HOST).get("/flaky").times(3).reply(429, { error: "busy" }).get("/flaky").reply(200, { ok: true });

    const client = new HttpClient(HOST);
    const response = await client.get<{ ok: boolean }>("/flaky");
    expect(response.status).toBe(200);
    expect(response.data.ok).toBe(true);
  });

  it("opens the circuit after sustained failures", async () => {

    const client = new HttpClient(HOST);

    nock(HOST).get("/down").times(12).reply(500, { error: "down" });

    await expect(client.get("/down")).rejects.toBeTruthy();
    await expect(client.get("/down")).rejects.toBeTruthy();
    await expect(client.get("/down")).rejects.toThrow("CircuitOpen");
  }, 15000);
});
