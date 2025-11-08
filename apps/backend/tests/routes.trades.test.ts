/* eslint-disable @typescript-eslint/no-var-requires */
import { describe, expect, it, beforeEach, afterEach } from "@jest/globals";
import request from "supertest";
import type { Express } from "express";

const userId = "11111111-1111-1111-1111-111111111111";

function loadApp(): Express {
  const { createApp } = require("../src/app");
  return createApp().app;
}

describe("/api/trades route - memory fallback", () => {
  let app: Express;

  beforeEach(() => {
    process.env.TRADES_MEMORY_STORE = "true";
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
    jest.resetModules();
    app = loadApp();
  });

  it("requires a user id", async () => {
    await request(app).get("/api/trades").expect(400);
  });

  it("creates and reads trades via memory store", async () => {
    const payload = { symbol: "AAPL", side: "BUY", entry: 123.45, qty: 1 };
    const created = await request(app)
      .post("/api/trades")
      .set("x-user-id", userId)
      .send(payload)
      .expect(201);

    expect(created.body.symbol).toBe("AAPL");
    expect(created.body.status).toBe("OPEN");

    const list = await request(app).get("/api/trades").set("x-user-id", userId).expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.some((t: any) => t.id === created.body.id)).toBe(true);

    const read = await request(app)
      .get(`/api/trades/${created.body.id}`)
      .set("x-user-id", userId)
      .expect(200);
    expect(read.body.id).toBe(created.body.id);
  });
});

describe("/api/trades route - supabase adapter", () => {
  let app: Express;

  beforeEach(() => {
    process.env.TRADES_MEMORY_STORE = "false";
    jest.resetModules();
    jest.doMock("../src/services/tradeService", () => {
      const actual = jest.requireActual("../src/services/tradeService");
      let store: any[] = [];
      const clone = () => store.map((t) => ({ ...t }));
      return {
        ...actual,
        listTrades: jest.fn(async (owner: string) => clone().filter((t) => t.owner === owner)),
        createTrade: jest.fn(async (owner: string, payload: any) => {
          const record = {
            id: `mock-${store.length}`,
            owner,
            status: "OPEN",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...payload,
          };
          store = [record, ...store];
          return record;
        }),
        getTrade: jest.fn(async (owner: string, id: string) => store.find((t) => t.owner === owner && t.id === id) ?? null),
        updateTrade: jest.fn(async (owner: string, id: string, partial: any) => {
          const idx = store.findIndex((t) => t.owner === owner && t.id === id);
          if (idx === -1) return null;
          store[idx] = { ...store[idx], ...partial };
          return store[idx];
        }),
        deleteTrade: jest.fn(async (owner: string, id: string) => {
          const before = store.length;
          store = store.filter((t) => !(t.owner === owner && t.id === id));
          return store.length !== before;
        }),
      };
    });
    app = loadApp();
  });

  afterEach(() => {
    jest.dontMock("../src/services/tradeService");
  });

  it("pipes requests through tradeService", async () => {
    const created = await request(app)
      .post("/api/trades")
      .set("x-user-id", userId)
      .send({ symbol: "MSFT", side: "SELL", entry: 200, qty: 2 })
      .expect(201);

    const list = await request(app).get("/api/trades").set("x-user-id", userId).expect(200);
    expect(list.body.find((t: any) => t.id === created.body.id)).toBeTruthy();

    await request(app)
      .patch(`/api/trades/${created.body.id}`)
      .set("x-user-id", userId)
      .send({ status: "CLOSED" })
      .expect(200);

    await request(app)
      .delete(`/api/trades/${created.body.id}`)
      .set("x-user-id", userId)
      .expect(200);
  });
});
