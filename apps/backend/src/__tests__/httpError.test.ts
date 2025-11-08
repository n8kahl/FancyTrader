import { HttpError, badRequest, notFound, tooManyRequests, internalError } from "../utils/httpError";

describe("HttpError", () => {
  it("carries status, code, and details", () => {
    const err = new HttpError(429, "boom", "RATE_LIMITED", { retryAfter: 1 });
    expect(err.message).toBe("boom");
    expect(err.status).toBe(429);
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.details).toEqual({ retryAfter: 1 });
  });

  it("exposes helpers for common HTTP errors", () => {
    expect(badRequest().status).toBe(400);
    expect(notFound("missing symbol").message).toBe("missing symbol");
    expect(tooManyRequests(undefined, "RATE_LIMITED").code).toBe("RATE_LIMITED");
    expect(internalError("uh oh", "UPSTREAM_ERROR", { ref: "abc" }).details).toEqual({ ref: "abc" });
  });
});
