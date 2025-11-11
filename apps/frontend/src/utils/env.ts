// apps/frontend/src/utils/env.ts

// Include both our VITE_* keys and Vite's built-ins (DEV/PROD/MODE)
type ClientEnv = {
  VITE_BACKEND_URL?: string;
  VITE_BACKEND_WS_URL?: string;
  VITE_DEMO_USER_ID?: string;
  VITE_STATUS_BANNER?: string;
  // Vite built-ins
  DEV?: boolean;
  PROD?: boolean;
  MODE?: string;
};

// Runtime-safe getter that works in browser builds
function getEnv(): ClientEnv {
  const env = (typeof import.meta !== "undefined" && (import.meta as any).env) || {};
  return env as ClientEnv;
}

export const isDev = () => getEnv().DEV ?? false;
export const isProd = () => getEnv().PROD ?? true;
export const getMode = () => getEnv().MODE ?? "production";

export const getBackendUrl = () => getEnv().VITE_BACKEND_URL || "https://fancy-trader.up.railway.app";
export const getBackendWsUrl = () =>
  getEnv().VITE_BACKEND_WS_URL || "wss://fancy-trader.up.railway.app/ws";
