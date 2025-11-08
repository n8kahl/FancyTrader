import { describe, expect, it, afterAll } from "@jest/globals";
import request from "supertest";
import type { Express } from "express";

const originalRateLimitMax = process.env.RATE_LIMIT_MAX;
const originalRateLimitWindow = process.env.RATE_LIMIT_WINDOW_MS;
const originalWebhook = process.env.DISCORD_WEBHOOK_URL;

const alertPayload = {
  symbol: "AAPL",
  condition: { type: "priceAbove", value: 200 },
};

const sharePayload = {
  trade: {
    id: "trade-1",
    symbol: "AAPL",
    setup: "BREAKOUT",
    status: "ACTIVE",
    tradeState: "SETUP",
    alertHistory: [],
  },
};

const buildApp = (): Express => {
  let built: Express | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createApp } = require("../src/app") as typeof import("../src/app");
    built = createApp().app;
  });
  if (!built) {
    throw new Error("Failed to build app instance");
  }
  return built;
};

afterAll(() => {
  if (originalRateLimitMax) {
    process.env.RATE_LIMIT_MAX = originalRateLimitMax;
  } else {
    delete process.env.RATE_LIMIT_MAX;
  }

  if (originalRateLimitWindow) {
    process.env.RATE_LIMIT_WINDOW_MS = originalRateLimitWindow;
  } else {
    delete process.env.RATE_LIMIT_WINDOW_MS;
  }

  if (originalWebhook) {
    process.env.DISCORD_WEBHOOK_URL = originalWebhook;
  } else {
    delete process.env.DISCORD_WEBHOOK_URL;
  }
});

describe("rate limit middleware", () => {
  it("allows multiple alert requests under the threshold", async () => {
    process.env.RATE_LIMIT_MAX = "5";
    delete process.env.DISCORD_WEBHOOK_URL;
    const app = buildApp();

    for (let i = 0; i < 3; i += 1) {
      await request(app).post("/api/alerts").send(alertPayload).expect(201);
    }
  });

  it("blocks share requests once the limit is reached", async () => {
    process.env.RATE_LIMIT_MAX = "2";
    delete process.env.DISCORD_WEBHOOK_URL;
    const app = buildApp();

    for (let i = 0; i < 2; i += 1) {
      await request(app).post("/api/share/discord/trade").send(sharePayload).expect(400);
    }

    const res = await request(app).post("/api/share/discord/trade").send(sharePayload);
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Rate limit exceeded/i);
  });
});
