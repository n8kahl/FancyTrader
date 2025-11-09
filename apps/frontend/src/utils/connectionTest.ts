/**
 * Connection Test Utilities
 * Helper functions to test backend connectivity
 */

import { apiClient } from "../services/apiClient";
import { wsClient } from "../services/websocketClient";
import { BACKEND_CONFIG } from "../config/backend";
import { DEFAULT_WATCHLIST } from "../config/watchlist";
import { logger } from "./logger";
import { DIAGNOSTICS_ENABLED } from "@/flags";
import { z } from "zod";
import type { Snapshot, ServerOutbound } from "@fancytrader/shared";

export interface ConnectionTestResult {
  test: string;
  passed: boolean;
  message: string;
  duration?: number;
  error?: string;
}

export interface AvailabilityResult {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

const snapshotSchema = z.object({
  symbol: z.string().min(1),
  price: z.number(),
  time: z.number(),
});

const serverOutboundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PRICE_UPDATE"), symbol: z.string(), price: z.number(), time: z.number() }),
  z.object({ type: z.literal("status"), message: z.string() }),
  z.object({ type: z.literal("error"), message: z.string(), code: z.string().optional() }),
  z.object({ type: z.literal("SUBSCRIPTIONS"), symbols: z.array(z.string()) }),
]);

let lastServerMessage: unknown = null;

/**
 * Run all connection tests
 */
export async function runConnectionTests(): Promise<ConnectionTestResult[]> {
  const results: ConnectionTestResult[] = [];

  logger.info("🧪 Running connection tests...");

  // Test 1: Backend reachability
  results.push(await testBackendReachability());

  // Test 2: Health endpoint
  results.push(await testHealthEndpoint());

  // Test 3: WebSocket connection
  results.push(await testWebSocketConnection());

  // Test 4: API endpoint
  results.push(await testApiEndpoint());

  // Test 5: Market data endpoint
  results.push(await testMarketDataEndpoint());

  const passedTests = results.filter((r) => r.passed).length;
  const totalTests = results.length;

  logger.info(`✅ Tests passed: ${passedTests}/${totalTests}`);

  if (DIAGNOSTICS_ENABLED) {
    const defaultSymbol = DEFAULT_WATCHLIST[0]?.symbol ?? "SPY";
    await validateSnapshot(defaultSymbol);
    validateServerOutboundSample(lastServerMessage);
    lastServerMessage = null;
  }

  return results;
}

/**
 * Test 1: Basic backend reachability
 */
async function testBackendReachability(): Promise<ConnectionTestResult> {
  const start = Date.now();

  try {
    const response = await fetch(BACKEND_CONFIG.httpUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });

    const duration = Date.now() - start;

    if (response.ok || response.status === 404) {
      // 404 is OK - means server is reachable
      return {
        test: "Backend Reachability",
        passed: true,
        message: `Backend is reachable at ${BACKEND_CONFIG.httpUrl}`,
        duration,
      };
    }

    return {
      test: "Backend Reachability",
      passed: false,
      message: `Unexpected status: ${response.status}`,
      duration,
    };
  } catch (error: unknown) {
    return {
      test: "Backend Reachability",
      passed: false,
      message: "Cannot reach backend",
      error: extractErrorMessage(error),
      duration: Date.now() - start,
    };
  }
}

/**
 * Test 2: Health endpoint
 */
async function testHealthEndpoint(): Promise<ConnectionTestResult> {
  const start = Date.now();

  try {
    const health = await apiClient.checkHealth();
    const duration = Date.now() - start;

    if (health.ok) {
      return {
        test: "Health Endpoint",
        passed: true,
        message: `Backend healthy (v${health.version}, uptime: ${Math.floor(health.uptimeSec)}s)`,
        duration,
      };
    }

    return {
      test: "Health Endpoint",
      passed: false,
      message: "Health check reported not ready",
      duration,
    };
  } catch (error: unknown) {
    return {
      test: "Health Endpoint",
      passed: false,
      message: "Health check failed",
      error: extractErrorMessage(error),
      duration: Date.now() - start,
    };
  }
}

/**
 * Test 3: WebSocket connection
 */
async function testWebSocketConnection(): Promise<ConnectionTestResult> {
  const start = Date.now();

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      finalize({
        test: "WebSocket Connection",
        passed: false,
        message: "WebSocket connection timeout",
        duration: Date.now() - start,
      });
    }, 5000);

    let unsubscribeMessage: (() => void) | undefined;
    if (DIAGNOSTICS_ENABLED) {
      unsubscribeMessage = wsClient.onMessage((message) => {
        if (!lastServerMessage) {
          lastServerMessage = message;
        }
      });
    }

    const cleanup = () => {
      clearTimeout(timeout);
      unsubscribeMessage?.();
      wsClient.disconnect();
    };

    function finalize(result: ConnectionTestResult): void {
      unsubscribeConnect();
      unsubscribeError();
      cleanup();
      resolve(result);
    }

    const unsubscribeConnect = wsClient.onConnect(() => {
      finalize({
        test: "WebSocket Connection",
        passed: true,
        message: "WebSocket connected successfully",
        duration: Date.now() - start,
      });
    });

    const unsubscribeError = wsClient.onError((error: unknown) => {
      finalize({
        test: "WebSocket Connection",
        passed: false,
        message: "WebSocket connection failed",
        error: extractErrorMessage(error),
        duration: Date.now() - start,
      });
    });

    wsClient.connect();
  });
}

/**
 * Test 4: API endpoint (Setups)
 */
async function testApiEndpoint(): Promise<ConnectionTestResult> {
  const start = Date.now();

  try {
    const setups = await apiClient.getSetups();
    const duration = Date.now() - start;

    return {
      test: "API Endpoint (Setups)",
      passed: true,
      message: `API working (${setups.length} setups found)`,
      duration,
    };
  } catch (error: unknown) {
    return {
      test: "API Endpoint (Setups)",
      passed: false,
      message: "API request failed",
      error: extractErrorMessage(error),
      duration: Date.now() - start,
    };
  }
}

/**
 * Test 5: Market data endpoint
 */
async function testMarketDataEndpoint(): Promise<ConnectionTestResult> {
  const start = Date.now();

  try {
    await apiClient.getMarketStatus();
    const duration = Date.now() - start;

    return {
      test: "Market Data Endpoint",
      passed: true,
      message: "Market data API responded successfully",
      duration,
    };
  } catch (error: unknown) {
    return {
      test: "Market Data Endpoint",
      passed: false,
      message: "Market data request failed",
      error: extractErrorMessage(error),
      duration: Date.now() - start,
    };
  }
}

async function validateSnapshot(symbol: string): Promise<void> {
  if (!DIAGNOSTICS_ENABLED) return;
  try {
    const snapshot: Snapshot = await apiClient.getSnapshot(symbol);
    const parsed = snapshotSchema.safeParse(snapshot);
    if (!parsed.success) {
      logger.warn("Snapshot payload failed validation", { symbol, issues: parsed.error.issues });
    }
  } catch (error) {
    logger.warn("Snapshot validation error", { symbol, error: extractErrorMessage(error) });
  }
}

function validateServerOutboundSample(sample: unknown): void {
  if (!DIAGNOSTICS_ENABLED || !sample) return;
  const parsed = serverOutboundSchema.safeParse(sample);
  if (parsed.success) {
    const _outbound: ServerOutbound = parsed.data;
    return;
  }
  logger.warn("Server outbound payload failed validation", { issues: parsed.error.issues });
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

/**
 * Log test results to console in a formatted way
 */
export function logTestResults(results: ConnectionTestResult[]): void {
  console.log("\n" + "=".repeat(60));
  console.log("📊 CONNECTION TEST RESULTS");
  console.log("=".repeat(60) + "\n");

  results.forEach((result, index) => {
    const icon = result.passed ? "✅" : "❌";
    const duration = result.duration ? ` (${result.duration}ms)` : "";

    console.log(`${index + 1}. ${icon} ${result.test}${duration}`);
    console.log(`   ${result.message}`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    console.log("");
  });

  const passedTests = results.filter((r) => r.passed).length;
  const totalTests = results.length;
  const passRate = ((passedTests / totalTests) * 100).toFixed(0);

  console.log("=".repeat(60));
  console.log(`✨ Summary: ${passedTests}/${totalTests} tests passed (${passRate}%)`);
  console.log("=".repeat(60) + "\n");
}

/**
 * Quick connection check (returns boolean)
 */
export async function isBackendAvailable(): Promise<AvailabilityResult> {
  const start = Date.now();
  try {
    const health = await apiClient.checkHealth();
    return { ok: health.ok, latencyMs: Date.now() - start };
  } catch (error) {
    return { ok: false, latencyMs: Date.now() - start, error: extractErrorMessage(error) };
  }
}

/**
 * Get connection status info
 */
export async function getConnectionInfo(): Promise<{
  backendUrl: string;
  wsUrl: string;
  isHealthy: boolean;
  isConnected: boolean;
  environment: string;
  latencyMs?: number;
  healthError?: string;
}> {
  const availability = await isBackendAvailable();
  const isConnected = wsClient.getConnectionStatus();

  return {
    backendUrl: BACKEND_CONFIG.httpUrl,
    wsUrl: BACKEND_CONFIG.wsUrl,
    isHealthy: availability.ok,
    isConnected,
    environment: BACKEND_CONFIG.isDevelopment ? "development" : "production",
    latencyMs: availability.latencyMs,
    healthError: availability.error,
  };
}
