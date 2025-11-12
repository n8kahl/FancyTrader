// Vitest <-> Jest compat shim + test env defaults
import { vi } from "vitest";

// Provide jest.* APIs via vi.*
// @ts-ignore
(globalThis as any).jest = {
  fn: vi.fn,
  spyOn: vi.spyOn,
  mock: vi.mock,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
  // common helpers used in some suites:
  useFakeTimers: vi.useFakeTimers,
  useRealTimers: vi.useRealTimers,
  advanceTimersByTime: vi.advanceTimersByTime,
};

// Minimal server env so zod(serverEnv) doesn't explode in tests
process.env.MASSIVE_API_KEY ??= "test_key";
process.env.MASSIVE_REST_BASE ??= "https://api.massive.test";
process.env.MASSIVE_WS_BASE ??= "wss://socket.massive.test";
process.env.MASSIVE_WS_CLUSTER ??= "options";
process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY ??= "anon_test_key";
