/**
 * Backend configuration
 * Update these URLs based on your deployment
 */

import { isDev, getBackendUrl, getBackendWsUrl } from "../utils/env";

// For local development
const LOCAL_HTTP_URL = "http://localhost:8080";
const LOCAL_WS_URL = "ws://localhost:8080/ws";

// For Railway production
const PRODUCTION_HTTP_URL = getBackendUrl();
const PRODUCTION_WS_URL = getBackendWsUrl();

// Auto-detect environment
const isDevelopment = isDev();

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
  getTrades: () => `${BACKEND_CONFIG.httpUrl}/api/trades`,
  postTrade: () => `${BACKEND_CONFIG.httpUrl}/api/trades`,

  // Market Data
  getSnapshot: (symbol: string) => `${BACKEND_CONFIG.httpUrl}/api/market/snapshot/${symbol}`,
  getBars: (symbol: string) => `${BACKEND_CONFIG.httpUrl}/api/market/bars/${symbol}`,
  getPreviousClose: (symbol: string) =>
    `${BACKEND_CONFIG.httpUrl}/api/market/previous-close/${symbol}`,
  getMarketStatus: () => `${BACKEND_CONFIG.httpUrl}/api/market/status`,

  // Options
  getOptionsContracts: (underlying: string) =>
    `${BACKEND_CONFIG.httpUrl}/api/options/contracts/${underlying}`,
  getOptionsSnapshot: (underlying: string, optionSymbol: string) =>
    `${BACKEND_CONFIG.httpUrl}/api/options/snapshot/${underlying}/${optionSymbol}`,
  getOptionsChain: (underlying: string) =>
    `${BACKEND_CONFIG.httpUrl}/api/options/chain/${underlying}`,

  // Watchlist
  getWatchlist: () => `${BACKEND_CONFIG.httpUrl}/api/watchlist`,
  addToWatchlist: () => `${BACKEND_CONFIG.httpUrl}/api/watchlist`,
  removeFromWatchlist: (symbol: string) => `${BACKEND_CONFIG.httpUrl}/api/watchlist/${symbol}`,

  // Share
  shareTrade: () => `${BACKEND_CONFIG.httpUrl}/api/share/discord/trade`,
  shareBacktest: () => `${BACKEND_CONFIG.httpUrl}/api/share/discord/backtest`,

  // Backtest
  runBacktest: () => `${BACKEND_CONFIG.httpUrl}/api/backtest/run`,
  getBacktestCsv: () => `${BACKEND_CONFIG.httpUrl}/api/backtest/csv`,

  // Alerts
  listAlerts: () => `${BACKEND_CONFIG.httpUrl}/api/alerts`,
  createAlert: () => `${BACKEND_CONFIG.httpUrl}/api/alerts`,
  deleteAlert: (id: string) => `${BACKEND_CONFIG.httpUrl}/api/alerts/${id}`,

  // Health check
  health: () => `${BACKEND_CONFIG.httpUrl}/healthz`,
};
