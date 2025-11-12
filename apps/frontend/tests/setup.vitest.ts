import { vi } from "vitest";
import "@testing-library/jest-dom";

// ---- jest compat ----
(globalThis as any).jest = {
  fn: vi.fn,
  spyOn: vi.spyOn,
  mock: vi.mock,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
  useFakeTimers: vi.useFakeTimers,
  useRealTimers: vi.useRealTimers,
  advanceTimersByTime: vi.advanceTimersByTime,
};

// ---- minimal server env so shared/serverEnv doesn't explode if imported transitively ----
process.env.MASSIVE_API_KEY ??= "test_key";
process.env.MASSIVE_REST_BASE ??= "https://api.massive.test";
process.env.MASSIVE_WS_BASE ??= "wss://socket.massive.test";
process.env.MASSIVE_WS_CLUSTER ??= "options";
process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY ??= "anon_test_key";

// ---- WebSocket mock that counts .send and allows emitting messages/errors/close ----
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  url: string;
  onopen: ((ev: any) => any) | null = null;
  onmessage: ((ev: any) => any) | null = null;
  onerror: ((ev: any) => any) | null = null;
  onclose: ((ev: any) => any) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: 1000, reason: "" });
  });
  constructor(url: string) {
    this.url = url;
    setTimeout(() => this.onopen?.({}), 0);
  }
  __emitMessage(data: any) {
    this.onmessage?.({ data });
  }
  __emitError(err?: any) {
    this.onerror?.(err ?? new Error("ws_error"));
  }
}
(globalThis as any).WebSocket = MockWebSocket as any;

if (!("fetch" in globalThis)) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) =>
    new Response(
      input.toString().includes("/readyz")
        ? JSON.stringify({ ok: true })
        : JSON.stringify({}),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  ) as any;
}
