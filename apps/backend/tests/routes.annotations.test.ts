/* eslint-disable @typescript-eslint/no-var-requires */
import { describe, expect, it, beforeEach, afterEach } from "@jest/globals";
import type { Express } from "express";
import request from "supertest";

const userId = "11111111-1111-1111-1111-111111111111";

function loadApp(): Express {
  const { createApp } = require("../src/app");
  return createApp().app;
}

describe("/api/chart/annotations - memory fallback", () => {
  let app: Express;

  beforeEach(() => {
    process.env.ANNOTATIONS_MEMORY_STORE = "true";
    jest.resetModules();
    app = loadApp();
  });

  it("rejects missing user id", async () => {
    await request(app).get("/api/chart/annotations").expect(400);
  });

  it("supports CRUD operations", async () => {
    const basePayload = { symbol: "AAPL", entry: 195.12, targets: [200] };

    const created = await request(app)
      .post("/api/chart/annotations")
      .set("x-user-id", userId)
      .send(basePayload)
      .expect(201);

    expect(created.body.annotation.symbol).toBe("AAPL");
    expect(created.body.annotation.targets).toEqual([200]);

    const list = await request(app)
      .get("/api/chart/annotations")
      .set("x-user-id", userId)
      .query({ symbol: "AAPL" })
      .expect(200);
    expect(Array.isArray(list.body.annotations)).toBe(true);
    expect(list.body.annotations[0].id).toBe(created.body.annotation.id);

    const updated = await request(app)
      .put(`/api/chart/annotations/${created.body.annotation.id}`)
      .set("x-user-id", userId)
      .send({ targets: [205, 210] })
      .expect(200);
    expect(updated.body.annotation.targets).toEqual([205, 210]);

    await request(app)
      .delete(`/api/chart/annotations/${created.body.annotation.id}`)
      .set("x-user-id", userId)
      .expect(200);
  });
});

describe("/api/chart/annotations - service wiring", () => {
  let app: Express;

  beforeEach(() => {
    process.env.ANNOTATIONS_MEMORY_STORE = "false";
    jest.resetModules();
    jest.doMock("../src/services/annotationService", () => {
      const actual = jest.requireActual("../src/services/annotationService");
      const store: any[] = [];
      return {
        ...actual,
        listAnnotations: jest.fn(async (owner: string) =>
          store.filter((item) => item.owner === owner)
        ),
        createAnnotation: jest.fn(async (owner: string, payload: any) => {
          const record = {
            id: `mock-${store.length}`,
            owner,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            targets: payload.targets ?? [],
            notes: payload.notes ?? null,
            ...payload,
          };
          store.unshift(record);
          return record;
        }),
        updateAnnotation: jest.fn(async (owner: string, id: string, partial: any) => {
          const idx = store.findIndex((item) => item.owner === owner && item.id === id);
          if (idx === -1) return null;
          store[idx] = { ...store[idx], ...partial };
          return store[idx];
        }),
        deleteAnnotation: jest.fn(async (owner: string, id: string) => {
          const before = store.length;
          const next = store.filter((item) => !(item.owner === owner && item.id === id));
          store.splice(0, store.length, ...next);
          return next.length !== before;
        }),
      };
    });
    app = loadApp();
  });

  afterEach(() => {
    jest.dontMock("../src/services/annotationService");
  });

  it("delegates to service layer", async () => {
    const payload = { symbol: "MSFT", entry: 310 };
    const created = await request(app)
      .post("/api/chart/annotations")
      .set("x-user-id", userId)
      .send(payload)
      .expect(201);

    await request(app)
      .put(`/api/chart/annotations/${created.body.annotation.id}`)
      .set("x-user-id", userId)
      .send({ stop: 300 })
      .expect(200);

    await request(app)
      .delete(`/api/chart/annotations/${created.body.annotation.id}`)
      .set("x-user-id", userId)
      .expect(200);
  });
});
