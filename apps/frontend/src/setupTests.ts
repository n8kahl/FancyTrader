import "@testing-library/jest-dom/vitest";

class MockResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  (globalThis as typeof globalThis & { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
    MockResizeObserver;
}
