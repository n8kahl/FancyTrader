/**
 * Safe environment variable accessor
 * Handles cases where import.meta.env might be undefined
 */

export const getEnv = () => {
  // Check if import.meta.env exists
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env;
  }
  
  // Fallback to empty object with defaults
  return {
    DEV: false,
    PROD: true,
    MODE: 'production',
    VITE_BACKEND_URL: undefined,
    VITE_BACKEND_WS_URL: undefined,
  };
};

export const isDev = () => {
  try {
    return getEnv().DEV ?? false;
  } catch {
    return false;
  }
};

export const isProd = () => {
  try {
    return getEnv().PROD ?? true;
  } catch {
    return true;
  }
};

export const getMode = () => {
  try {
    return getEnv().MODE ?? 'production';
  } catch {
    return 'production';
  }
};

export const getBackendUrl = () => {
  try {
    return getEnv().VITE_BACKEND_URL || 'https://fancy-trader.up.railway.app';
  } catch {
    return 'https://fancy-trader.up.railway.app';
  }
};

export const getBackendWsUrl = () => {
  try {
    return getEnv().VITE_BACKEND_WS_URL || 'wss://fancy-trader.up.railway.app/ws';
  } catch {
    return 'wss://fancy-trader.up.railway.app/ws';
  }
};
