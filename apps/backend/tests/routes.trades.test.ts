import { beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/app";

const buildApp = (): Express => {
  const { app } = createApp();
  return app;
};

describe("/api/trades CRUD", () => {
  let app: Express;

  beforeEach(() => {
    app = buildApp();
  });

  const tradePayload = {
    symbol: "aapl",
    entryPrice: 100,
    stop: 95,
    target: 110,
    status: "ACTIVE",
  };

  it("creates, reads, updates, and deletes trades", async () => {
    const createRes = await request(app).post("/api/trades").send(tradePayload).expect(201);

    expect(createRes.body.ok).toBe(true);
    expect(createRes.body.trade.symbol).toBe("AAPL");
    const tradeId = createRes.body.trade.id;

    const listRes = await request(app).get("/api/trades").expect(200);
    expect(Array.isArray(listRes.body.trades)).toBe(true);
    expect(listRes.body.trades).toHaveLength(1);

    const updateRes = await request(app)
      .put(`/api/trades/${tradeId}`)
      .send({ ...tradePayload, symbol: "msft", entryPrice: 101 })
      .expect(200);

    expect(updateRes.body.trade.symbol).toBe("MSFT");
    expect(updateRes.body.trade.entryPrice).toBe(101);

    const singleRes = await request(app).get(`/api/trades/${tradeId}`).expect(200);
    expect(singleRes.body.trade.id).toBe(tradeId);

    await request(app).delete(`/api/trades/${tradeId}`).expect(200);

    const afterDelete = await request(app).get("/api/trades").expect(200);
    expect(afterDelete.body.trades).toHaveLength(0);
  });

  it("returns 404 when deleting a non-existent trade", async () => {
    await request(app).delete("/api/trades/unknown").expect(404);
  });
});
