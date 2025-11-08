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

const httpKey = (method: string, path: string): string => {
  const normalMethod = method.toUpperCase();
  const normalizedPath = path.replace(/\:\w+/g, ":param");
  return `${normalMethod}_${normalizedPath}`;
};

export function incHttp(method: string, path: string): void {
  const key = httpKey(method, path);
  metrics.http[key] = (metrics.http[key] ?? 0) + 1;
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
