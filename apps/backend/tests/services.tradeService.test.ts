process.env.TRADES_MEMORY_STORE = "false";

jest.mock("../src/lib/supabase", () => {
  let rows: any[] = [];

  const matches = (row: any, filters: Record<string, any>) =>
    Object.entries(filters).every(([key, val]) => row[key] === val);

  const makeSelectBuilder = () => {
    const filters: Record<string, any> = {};
    return {
      select() {
        return this;
      },
      eq(col: string, val: any) {
        filters[col] = val;
        return this;
      },
      order() {
        const data = rows.filter((row) => matches(row, filters));
        return Promise.resolve({ data, error: null });
      },
      single() {
        const found = rows.find((row) => matches(row, filters));
        return Promise.resolve(found ? { data: found, error: null } : { data: null, error: { code: "PGRST116" } });
      },
    };
  };

  const makeUpdateBuilder = (partial: any) => {
    const filters: Record<string, any> = {};
    return {
      eq(col: string, val: any) {
        filters[col] = val;
        return this;
      },
      select() {
        return {
          single() {
            const index = rows.findIndex((row) => matches(row, filters));
            if (index === -1) return Promise.resolve({ data: null, error: { code: "PGRST116" } });
            rows[index] = { ...rows[index], ...partial };
            return Promise.resolve({ data: rows[index], error: null });
          },
        };
      },
    };
  };

  const makeDeleteBuilder = () => {
    const filters: Record<string, any> = {};
    const builder: any = {
      eq(col: string, val: any) {
        filters[col] = val;
        return builder;
      },
      then(onFulfilled?: (value: any) => any, onRejected?: (reason: any) => any) {
        const before = rows.length;
        rows = rows.filter((row) => !matches(row, filters));
        const result = { error: null, count: before - rows.length };
        return Promise.resolve(result).then(onFulfilled, onRejected);
      },
    };
    return builder;
  };

  return {
    supabaseAdmin: {
      from: () => ({
        select: () => makeSelectBuilder(),
        insert: (payload: any[]) => ({
          select: () => ({
            single: () => {
              const row = { id: payload[0].id ?? payload[0].symbol, ...payload[0] };
              rows.push(row);
              return Promise.resolve({ data: row, error: null });
            },
          }),
        }),
        update: (partial: any) => makeUpdateBuilder(partial),
        delete: () => makeDeleteBuilder(),
      }),
    },
    assertAdminClient: () => {},
    __reset: () => {
      rows = [];
    },
  };
});

import { createTrade, listTrades, getTrade, updateTrade, deleteTrade } from "../src/services/tradeService";

const supabaseMock = require("../src/lib/supabase");

describe("tradeService", () => {
  const owner = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    supabaseMock.__reset();
  });

  it("creates and lists trades", async () => {
    await createTrade(owner, { symbol: "AAPL", side: "BUY", entry: 100, qty: 1 });
    const list = await listTrades(owner);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(1);
  });

  it("reads, updates, and deletes trades", async () => {
    const created = await createTrade(owner, { symbol: "MSFT", side: "SELL", entry: 200, qty: 1 });
    const id = (created as any).id;
    await getTrade(owner, id);
    await updateTrade(owner, id, { status: "CLOSED" as any });
    const removed = await deleteTrade(owner, id);
    expect(removed).toBe(true);
  });
});
