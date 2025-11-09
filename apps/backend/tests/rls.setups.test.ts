import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { SupabaseSetupsService, type SetupRecord } from "../src/services/supabaseSetups";

type SeedRow = SetupRecord;

class MockQueryBuilder {
  private mode: "select" | "insert" | "delete" | null = null;
  private filters: Record<string, string> = {};
  private pending: { owner: string; symbol: string; payload: unknown } | null = null;

  constructor(private readonly rows: SeedRow[]) {}

  select(): this {
    if (this.mode !== "insert") {
      this.mode = "select";
    }
    return this;
  }

  eq(field: string, value: string): this {
    if (this.mode === "select") {
      this.filters[field] = value;
      return this;
    }
    throw new Error('Unsupported eq operation for mode ' + this.mode);
  }

  order(): this {
    return this;
  }

  async limit(limit: number) {
    if (this.mode !== "select") {
      throw new Error("limit() is only supported for select queries in this mock");
    }
    const filtered = this.rows.filter((row) =>
      Object.entries(this.filters).every(([key, value]) => (row as Record<string, string>)[key] === value)
    );
    return { data: filtered.slice(0, limit), error: null };
  }

  insert(payload: { owner: string; symbol: string; payload: unknown }): this {
    this.mode = "insert";
    this.pending = payload;
    return this;
  }

  async single() {
    if (this.mode !== "insert" || !this.pending) {
      throw new Error("single() requires an insert payload");
    }
    const row: SeedRow = {
      id: randomUUID(),
      owner: this.pending.owner,
      symbol: this.pending.symbol.toUpperCase(),
      payload: this.pending.payload,
      detected_at: new Date().toISOString(),
    };
    this.rows.push(row);
    this.pending = null;
    return { data: row, error: null };
  }

  delete(): this {
    this.mode = "delete";
    return this;
  }

  async match(filters: Record<string, string>) {
    if (this.mode !== "delete") {
      throw new Error("match() requires delete mode");
    }
    for (let i = this.rows.length - 1; i >= 0; i -= 1) {
      const row = this.rows[i];
      const matches = Object.entries(filters).every(([key, value]) => (row as Record<string, string>)[key] === value);
      if (matches) {
        this.rows.splice(i, 1);
      }
    }
    return { data: null, error: null };
  }
}

const createMockClient = (seed: SeedRow[] = []) => {
  const rows = [...seed];
  return {
    rows,
    from() {
      return new MockQueryBuilder(rows);
    },
  };
};

describe("Supabase setups RLS", () => {
  it("only returns rows for the requested owner", async () => {
    const ownerA = randomUUID();
    const ownerB = randomUUID();
    const client = createMockClient([
      { id: randomUUID(), owner: ownerA, symbol: "AAPL", payload: { note: "A" }, detected_at: new Date().toISOString() },
      { id: randomUUID(), owner: ownerB, symbol: "MSFT", payload: { note: "B" }, detected_at: new Date().toISOString() },
    ]);

    const service = new SupabaseSetupsService(client as never);
    const ownerRows = await service.listSetups(ownerA, 10);
    expect(ownerRows).toHaveLength(1);
    expect(ownerRows[0]?.owner).toBe(ownerA);

    const otherRows = await service.listSetups(ownerB, 10);
    expect(otherRows).toHaveLength(1);
    expect(otherRows[0]?.owner).toBe(ownerB);
  });

  it("prevents deleting another owner's setup when owner is provided", async () => {
    const ownerA = randomUUID();
    const ownerB = randomUUID();
    const targetId = randomUUID();
    const client = createMockClient([
      { id: targetId, owner: ownerA, symbol: "TSLA", payload: { note: "edge" }, detected_at: new Date().toISOString() },
    ]);

    const service = new SupabaseSetupsService(client as never);
    await service.deleteSetup(targetId, ownerB);
    expect(client.rows.some((row) => row.id === targetId)).toBe(true);

    await service.deleteSetup(targetId, ownerA);
    expect(client.rows.some((row) => row.id === targetId)).toBe(false);
  });

  it("stores setups under the specified owner", async () => {
    const ownerA = randomUUID();
    const ownerB = randomUUID();
    const client = createMockClient();
    const service = new SupabaseSetupsService(client as never);

    await service.saveSetup(ownerA, "AAPL", { note: "alpha" });
    const ownerRows = await service.listSetups(ownerA, 10);
    expect(ownerRows).toHaveLength(1);
    const otherOwnerRows = await service.listSetups(ownerB, 10);
    expect(otherOwnerRows).toHaveLength(0);
  });
});
