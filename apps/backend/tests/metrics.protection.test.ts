import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/app";

const { app } = createApp();

describe("/api/metrics admin protection", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalAdminKey = process.env.ADMIN_KEY;
  const adminKey = "test-admin-key";

  beforeAll(() => {
    process.env.ADMIN_KEY = adminKey;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalAdminKey) {
      process.env.ADMIN_KEY = originalAdminKey;
    } else {
      delete process.env.ADMIN_KEY;
    }
  });

  it("allows access without key outside production", async () => {
    process.env.NODE_ENV = "development";
    const res = await request(app).get("/api/metrics").expect(200);
    expect(res.body).toHaveProperty("startedAt");
  });

  it("rejects when key missing in header during production", async () => {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_KEY = adminKey;
    await request(app).get("/api/metrics").expect(403);
  });

  it("allows access when correct header supplied in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_KEY = adminKey;
    const res = await request(app).get("/api/metrics").set("x-admin-key", adminKey).expect(200);
    expect(res.body).toHaveProperty("http");
  });

  it("returns 503 if ADMIN_KEY is not configured in production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ADMIN_KEY;
    await request(app).get("/api/metrics").expect(503);
    process.env.ADMIN_KEY = adminKey;
  });
});
