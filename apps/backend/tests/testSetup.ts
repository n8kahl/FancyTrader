import { vi } from "vitest";

(globalThis as any).jest = vi;

declare global {
  const jest: typeof vi;
}
