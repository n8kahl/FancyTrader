import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "@jest/globals";
import nock from "nock";
import request from "supertest";
import type { Express } from "express";

const base = "https://discord.com";
const path = "/api/webhooks/1234567890/XYZ";
const webhook = `${base}${path}`;

const tradePayload = {
  trade: {
    id: "trade-1",
    symbol: "AAPL",
    setup: "BREAKOUT",
    status: "ACTIVE",
    tradeState: "SETUP",
    alertHistory: [],
  },
};

const originalEnv = {
  enabled: process.env.DISCORD_ENABLED,
  webhook: process.env.DISCORD_WEBHOOK_URL,
  maxRetries: process.env.DISCORD_MAX_RETRIES,
  retryBase: process.env.DISCORD_RETRY_BASE_MS,
  timeout: process.env.DISCORD_TIMEOUT_MS,
};

const buildApp = async (): Promise<Express> => {
  vi.resetModules();
  const { createApp } = await import("../src/app");
  const { app } = await createApp();
  return app;
};

const setDefaultEnv = (): void => {
  process.env.DISCORD_ENABLED = "true";
  process.env.DISCORD_WEBHOOK_URL = webhook;
  process.env.DISCORD_MAX_RETRIES = "2";
  process.env.DISCORD_RETRY_BASE_MS = "10";
  process.env.DISCORD_TIMEOUT_MS = "100";
};

const restoreEnv = (): void => {
  if (originalEnv.enabled !== undefined) {
    process.env.DISCORD_ENABLED = originalEnv.enabled;
  } else {
    delete process.env.DISCORD_ENABLED;
  }

  if (originalEnv.webhook !== undefined) {
    process.env.DISCORD_WEBHOOK_URL = originalEnv.webhook;
  } else {
    delete process.env.DISCORD_WEBHOOK_URL;
  }

  if (originalEnv.maxRetries !== undefined) {
    process.env.DISCORD_MAX_RETRIES = originalEnv.maxRetries;
  } else {
    delete process.env.DISCORD_MAX_RETRIES;
  }

  if (originalEnv.retryBase !== undefined) {
    process.env.DISCORD_RETRY_BASE_MS = originalEnv.retryBase;
  } else {
    delete process.env.DISCORD_RETRY_BASE_MS;
  }

  if (originalEnv.timeout !== undefined) {
    process.env.DISCORD_TIMEOUT_MS = originalEnv.timeout;
  } else {
    delete process.env.DISCORD_TIMEOUT_MS;
  }
};

describe("Discord sharing resiliency", () => {
  beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect("127.0.0.1");
  });

  beforeEach(() => {
    setDefaultEnv();
    nock.cleanAll();
  });

  afterAll(() => {
    restoreEnv();
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it("retries on Discord errors and eventually succeeds", async () => {
    const app = await buildApp();

    const scope = nock(base)
      .post(path)
      .reply(500, { error: "server" })
      .post(path)
      .reply(204);

    const res = await request(app)
      .post("/api/share/discord/trade")
      .set("x-idempotency-key", "retry-success")
      .send(tradePayload);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(scope.isDone()).toBe(true);
  });

  it("returns cached response when idempotency key repeats", async () => {
    const app = await buildApp();
    const key = "duplicate-key";

    const scope = nock(base).post(path).reply(204);

    const first = await request(app)
      .post("/api/share/discord/trade")
      .set("x-idempotency-key", key)
      .send(tradePayload);

    expect(first.status).toBe(200);
    expect(scope.isDone()).toBe(true);

    const second = await request(app)
      .post("/api/share/discord/trade")
      .set("x-idempotency-key", key)
      .send(tradePayload);

    expect(second.status).toBe(200);
    expect(second.body.ok).toBe(true);
    expect(nock.pendingMocks()).toHaveLength(0);
  });

  it("fails with 502 after max retries", async () => {
    const app = await buildApp();

    const scope = nock(base).post(path).times(3).reply(500, { error: "server" });

    const res = await request(app)
      .post("/api/share/discord/trade")
      .set("x-idempotency-key", "max-retries")
      .send(tradePayload);

    expect(res.status).toBe(502);
    expect(res.body.error.message).toMatch(/Discord send failed/);
    expect(scope.isDone()).toBe(true);
  });

  it("short-circuits when Discord integration disabled", async () => {
    process.env.DISCORD_ENABLED = "false";
    const app = await buildApp();

    const res = await request(app).post("/api/share/discord/trade").send(tradePayload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DISCORD_DISABLED");
    expect(nock.pendingMocks()).toHaveLength(0);
  });
});
