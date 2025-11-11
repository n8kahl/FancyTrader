import { afterEach, describe, expect, it, vi } from "vitest";

async function loadGuard(overrides?: Record<string, string | undefined>) {
  vi.resetModules();
  if (overrides) {
    Object.assign(process.env, overrides);
  }
  const module = await import("../src/security/wsGuard");
  return module.isAllowedOrigin;
}

describe("wsGuard", () => {
  afterEach(() => {
    delete process.env.CORS_ALLOWLIST;
  });

  it("allows any origin when allowlist unset", async () => {
    const isAllowedOrigin = await loadGuard({ CORS_ALLOWLIST: "" });
    expect(isAllowedOrigin("https://example.com")).toBe(true);
  });

  it("allows configured origins and blocks others", async () => {
    const isAllowedOrigin = await loadGuard({
      CORS_ALLOWLIST: "https://app.example.com,https://beta.example.com",
    });
    expect(isAllowedOrigin("https://app.example.com")).toBe(true);
    expect(isAllowedOrigin("https://beta.example.com/page")).toBe(true);
    expect(isAllowedOrigin("https://evil.com")).toBe(false);
  });

  it("rejects missing origin", async () => {
    const isAllowedOrigin = await loadGuard({
      CORS_ALLOWLIST: "https://foo",
    });
    expect(isAllowedOrigin(undefined)).toBe(false);
  });
});
