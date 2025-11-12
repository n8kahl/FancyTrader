import client from "prom-client";

export interface Counters {
  http: Record<string, number>;
  ws: { connected: number; totalConnections: number };
  massive: { restCalls: number; rest429: number; wsMessages: number };
  startedAt: number;
}

export const metrics: Counters = {
  http: {},
  ws: { connected: 0, totalConnections: 0 },
  massive: { restCalls: 0, rest429: 0, wsMessages: 0 },
  startedAt: Date.now(),
};

export const register = client.register;

export let httpRequests: client.Counter;

const normalizePath = (path: string): string => path.replace(/:\w+/g, ":param");

const httpKey = (method: string, path: string): string => {
  const normalMethod = method.toUpperCase();
  const normalizedPath = normalizePath(path);
  return `${normalMethod}_${normalizedPath}`;
};

export function incHttp(method: string, path: string, status = 200): void {
  const key = httpKey(method, path);
  metrics.http[key] = (metrics.http[key] ?? 0) + 1;
  httpRequests.inc({ route: normalizePath(path), method: method.toUpperCase(), status: String(status) });
}

export function onWsConnect(): void {
  metrics.ws.connected += 1;
  metrics.ws.totalConnections += 1;
}

export function onWsDisconnect(): void {
  metrics.ws.connected = Math.max(0, metrics.ws.connected - 1);
}

export function incMassiveRest(ok: boolean, status?: number): void {
  metrics.massive.restCalls += 1;
  if (!ok || status === 429) {
    metrics.massive.rest429 += 1;
  }
}

export const incPolygonRest = incMassiveRest;

export function incPolygonWsMessages(count = 1): void {
  metrics.massive.wsMessages += count;
}

// === Massive WebSocket metrics ===
export let massiveWsConnected: client.Gauge;
export let massiveWsConnectsTotal: client.Counter;
export let massiveWsDisconnectsTotal: client.Counter;
export let massiveWsMessagesTotal: client.Counter;
export let massiveWsErrorsTotal: client.Counter;
export let massiveWsHeartbeatMissedTotal: client.Counter;
export let massiveWsReconnectsTotal: client.Counter;

let metricsConfigured = false;

function configureMetrics(): void {
  if (metricsConfigured) {
    return;
  }
  register.clear();
  client.collectDefaultMetrics({ register });

  httpRequests = new client.Counter({
    name: "http_requests_total",
    help: "HTTP requests by route, method, and status",
    labelNames: ["route", "method", "status"] as const,
    registers: [register],
  });

  massiveWsConnected = new client.Gauge({
    name: "massive_ws_connected",
    help: "1 if Massive WS is connected, else 0",
    registers: [register],
  });

  massiveWsConnectsTotal = new client.Counter({
    name: "massive_ws_connects_total",
    help: "Total Massive WS open/connect events",
    registers: [register],
  });

  massiveWsDisconnectsTotal = new client.Counter({
    name: "massive_ws_disconnects_total",
    help: "Total Massive WS close/disconnect events",
    registers: [register],
  });

  massiveWsMessagesTotal = new client.Counter({
    name: "massive_ws_messages_total",
    help: "Total Massive WS messages received",
    registers: [register],
  });

  massiveWsErrorsTotal = new client.Counter({
    name: "massive_ws_errors_total",
    help: "Total Massive WS error events",
    registers: [register],
  });

  massiveWsHeartbeatMissedTotal = new client.Counter({
    name: "massive_ws_heartbeat_missed_total",
    help: "Total Massive WS heartbeat_missed events",
    registers: [register],
  });

  massiveWsReconnectsTotal = new client.Counter({
    name: "massive_ws_reconnects_total",
    help: "Total Massive WS forced restarts by watchdog/backoff",
    registers: [register],
  });

  metricsConfigured = true;
}

configureMetrics();
