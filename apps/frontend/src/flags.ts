const envDiagnostics =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_DIAGNOSTICS === "true";

const runtimeDiagnostics =
  typeof globalThis !== "undefined" &&
  typeof (globalThis as { __FT_DIAGNOSTICS__?: boolean }).__FT_DIAGNOSTICS__ === "boolean"
    ? Boolean((globalThis as { __FT_DIAGNOSTICS__?: boolean }).__FT_DIAGNOSTICS__)
    : false;

export const DIAGNOSTICS_ENABLED = Boolean(envDiagnostics || runtimeDiagnostics);
