import { afterAll, describe, expect, it, jest } from "@jest/globals";

describe("supabase library bootstrap", () => {
  const original = {
    url: process.env.SUPABASE_URL,
    anon: process.env.SUPABASE_ANON_KEY,
    service: process.env.SUPABASE_SERVICE_KEY,
  };

  afterAll(() => {
    process.env.SUPABASE_URL = original.url;
    process.env.SUPABASE_ANON_KEY = original.anon;
    process.env.SUPABASE_SERVICE_KEY = original.service;
  });

  it("handles missing envs gracefully", async () => {
    jest.resetModules();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
    const lib = await import("../src/lib/supabase.ts");
    expect(lib.supabaseAdmin).toBeNull();
    expect(() => lib.assertAdminClient()).toThrow();
  });

  it("exports factory for per-user client", async () => {
    jest.resetModules();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon";
    const lib = await import("../src/lib/supabase.ts");
    expect(() => lib.supabaseForUser("token")).not.toThrow();
  });
});
