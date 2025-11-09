import { afterEach, describe, expect, it } from "@jest/globals";
import { isAllowedOrigin } from "../src/security/wsGuard";

describe("wsGuard", () => {
  afterEach(() => {
    delete process.env.ALLOWED_WS_ORIGINS;
  });

  it("allows any origin when env unset", () => {
    expect(isAllowedOrigin("https://example.com")).toBe(true);
  });

  it("allows configured origins and blocks others", () => {
    process.env.ALLOWED_WS_ORIGINS = "https://app.example.com,https://beta.example.com";
    expect(isAllowedOrigin("https://app.example.com")).toBe(true);
    expect(isAllowedOrigin("https://beta.example.com/page")).toBe(true);
    expect(isAllowedOrigin("https://evil.com")).toBe(false);
  });

  it("rejects missing origin", () => {
    process.env.ALLOWED_WS_ORIGINS = "https://foo";
    expect(isAllowedOrigin(undefined)).toBe(false);
  });
});
