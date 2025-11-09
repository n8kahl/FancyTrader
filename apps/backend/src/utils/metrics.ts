import client from "prom-client";

export interface Counters {
  http: Record<string, number>;
  ws: { connected: number; totalConnections: number };
  polygon: { restCalls: number; rest429: number; wsMessages: number };
  startedAt: number;
}

export const metrics: Counters = {
  http: {},
  ws: { connected: 0, totalConnections: 0 },
  polygon: { restCalls: 0, rest429: 0, wsMessages: 0 },
  startedAt: Date.now(),
};

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequests = new client.Counter({
  name: "http_requests_total",
  help: "HTTP requests by route, method, and status",
  labelNames: ["route", "method", "status"] as const,
});
register.registerMetric(httpRequests);

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

export function incPolygonRest(ok: boolean, status?: number): void {
  metrics.polygon.restCalls += 1;
  if (!ok || status === 429) {
    metrics.polygon.rest429 += 1;
  }
}

export function incPolygonWsMessages(count = 1): void {
  metrics.polygon.wsMessages += count;
}
