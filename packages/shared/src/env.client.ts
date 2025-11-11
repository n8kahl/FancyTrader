type ClientEnv = {
  VITE_BACKEND_URL?: string;
  VITE_BACKEND_WS_URL?: string;
  VITE_DEMO_USER_ID?: string;
  VITE_STATUS_BANNER?: string;
  DEV?: boolean;
  PROD?: boolean;
  MODE?: string;
};

export const clientEnv = (() => {
  const env = (typeof import.meta !== "undefined" && (import.meta as any).env) || {};
  return env as ClientEnv;
})();
