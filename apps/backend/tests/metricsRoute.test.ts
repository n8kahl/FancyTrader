import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/app";

const { app } = createApp();

describe("/api/metrics", () => {
  const adminKey = "test-admin-key";
  const original = process.env.ADMIN_KEY;

  beforeAll(() => {
    process.env.ADMIN_KEY = adminKey;
  });

  afterAll(() => {
    if (original) {
      process.env.ADMIN_KEY = original;
    } else {
      delete process.env.ADMIN_KEY;
    }
  });

  it("rejects when header missing", async () => {
    await request(app).get("/api/metrics").expect(401);
  });

  it("serves Prometheus payload when admin header matches", async () => {
    const res = await request(app)
      .get("/api/metrics")
      .set("x-admin-key", adminKey)
      .expect(200);
    expect(res.headers["content-type"]).toMatch(/text\/plain/);
    expect(res.text).toContain("http_requests_total");
  });

  it("returns 503 when ADMIN_KEY missing", async () => {
    delete process.env.ADMIN_KEY;
    await request(app).get("/api/metrics").expect(503);
    process.env.ADMIN_KEY = adminKey;
  });
});
