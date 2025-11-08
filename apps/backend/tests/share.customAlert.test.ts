import { afterEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import nock from "nock";
import type { Express } from "express";

const base = "https://discord.com";
const path = "/api/webhooks/123/custom";

const buildApp = (): Express => {
  let built: Express | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createApp } = require("../src/app") as typeof import("../src/app");
    built = createApp().app;
  });
  if (!built) {
    throw new Error("Failed to create app instance");
  }
  return built;
};

const payload = {
  symbol: "SPY",
  type: "TRIM_50" as const,
  content: "Trim 50% position at $505",
};

afterEach(() => {
  delete process.env.DISCORD_ENABLED;
  delete process.env.DISCORD_WEBHOOK_URL;
  nock.cleanAll();
});

describe("POST /api/share/discord/alert", () => {
  it("returns 409 when Discord is disabled", async () => {
    process.env.DISCORD_ENABLED = "false";
    const app = buildApp();

    const res = await request(app).post("/api/share/discord/alert").send(payload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DISCORD_DISABLED");
  });

  it("sends alert when Discord configured", async () => {
    process.env.DISCORD_ENABLED = "true";
    process.env.DISCORD_WEBHOOK_URL = `${base}${path}`;
    const app = buildApp();

    const scope = nock(base).post(path).reply(204);

    const res = await request(app)
      .post("/api/share/discord/alert")
      .set("x-idempotency-key", "custom-alert")
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(scope.isDone()).toBe(true);
  });
});
