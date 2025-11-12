import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

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

// ---- server env for shared/serverEnv zod ----
process.env.MASSIVE_API_KEY ??= "test_key";
process.env.MASSIVE_REST_BASE ??= "https://api.massive.test";
process.env.MASSIVE_WS_BASE ??= "wss://socket.massive.test";
process.env.MASSIVE_WS_CLUSTER ??= "options";
process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY ??= "anon_test_key";

// ---- ResizeObserver polyfill for Radix/scroll areas etc. ----
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver ||= RO;

// ---- WebSocket mock with EventTarget-like API ----
type Listener = (ev: any) => void;

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;

  onopen: Listener | null = null;
  onmessage: Listener | null = null;
  onerror: Listener | null = null;
  onclose: Listener | null = null;

  private listeners = new Map<string, Set<Listener>>();

  constructor(url: string) {
    this.url = url;
    queueMicrotask(() => {
      this.dispatchEvent("open", {});
    });
  }

  addEventListener(type: string, cb: Listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb);
  }

  removeEventListener(type: string, cb: Listener) {
    this.listeners.get(type)?.delete(cb);
  }

  dispatchEvent(type: string, ev: any) {
    const handler = (this as any)[`on${type}`] as Listener | null;
    if (handler) handler(ev);
    for (const cb of this.listeners.get(type) ?? []) cb(ev);
    return true;
  }

  send = vi.fn();

  close = vi.fn((code = 1000, reason = "") => {
    this.readyState = MockWebSocket.CLOSED;
    this.dispatchEvent("close", { code, reason });
  });

  __emitMessage(data: any) {
    this.dispatchEvent("message", { data });
  }

  __emitError(err?: any) {
    this.dispatchEvent("error", err ?? new Error("ws_error"));
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
