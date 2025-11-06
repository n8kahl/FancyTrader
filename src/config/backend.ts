/**
 * Backend configuration
 * Update these URLs based on your deployment
 */

// For local development
const LOCAL_HTTP_URL = 'http://localhost:8080';
const LOCAL_WS_URL = 'ws://localhost:8080/ws';

// For Railway production
const PRODUCTION_HTTP_URL = (import.meta.env?.VITE_BACKEND_URL as string) || 'https://fancy-trader.up.railway.app';
const PRODUCTION_WS_URL = (import.meta.env?.VITE_BACKEND_WS_URL as string) || 'wss://fancy-trader.up.railway.app/ws';

// Auto-detect environment
const isDevelopment = import.meta.env?.DEV ?? true;

export const BACKEND_CONFIG = {
  httpUrl: isDevelopment ? LOCAL_HTTP_URL : PRODUCTION_HTTP_URL,
  wsUrl: isDevelopment ? LOCAL_WS_URL : PRODUCTION_WS_URL,
  isDevelopment,
};

// API endpoints
export const API_ENDPOINTS = {
  // Setups
  getSetups: () => `${BACKEND_CONFIG.httpUrl}/api/setups`,
  getSetupsBySymbol: (symbol: string) => `${BACKEND_CONFIG.httpUrl}/api/setups/${symbol}`,
  getSetupsHistory: (userId: string) => `${BACKEND_CONFIG.httpUrl}/api/setups/history/${userId}`,
  deleteSetup: (setupId: string) => `${BACKEND_CONFIG.httpUrl}/api/setups/${setupId}`,
  
  // Market Data
  getSnapshot: (symbol: string) => `${BACKEND_CONFIG.httpUrl}/api/market/snapshot/${symbol}`,
  getBars: (symbol: string) => `${BACKEND_CONFIG.httpUrl}/api/market/bars/${symbol}`,
  getPreviousClose: (symbol: string) => `${BACKEND_CONFIG.httpUrl}/api/market/previous-close/${symbol}`,
  getMarketStatus: () => `${BACKEND_CONFIG.httpUrl}/api/market/status`,
  
  // Options
  getOptionsContracts: (underlying: string) => `${BACKEND_CONFIG.httpUrl}/api/options/contracts/${underlying}`,
  getOptionsSnapshot: (underlying: string, optionSymbol: string) => 
    `${BACKEND_CONFIG.httpUrl}/api/options/snapshot/${underlying}/${optionSymbol}`,
  getOptionsChain: (underlying: string) => `${BACKEND_CONFIG.httpUrl}/api/options/chain/${underlying}`,
  
  // Watchlist
  getWatchlist: (userId: string) => `${BACKEND_CONFIG.httpUrl}/api/watchlist/${userId}`,
  saveWatchlist: (userId: string) => `${BACKEND_CONFIG.httpUrl}/api/watchlist/${userId}`,
  addToWatchlist: (userId: string) => `${BACKEND_CONFIG.httpUrl}/api/watchlist/${userId}/add`,
  removeFromWatchlist: (userId: string, symbol: string) => 
    `${BACKEND_CONFIG.httpUrl}/api/watchlist/${userId}/remove/${symbol}`,
  
  // Health check
  health: () => `${BACKEND_CONFIG.httpUrl}/health`,
};
