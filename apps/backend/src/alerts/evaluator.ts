import { AlertRegistry, type Alert } from "./registry.js";
import { logger } from "../utils/logger.js";
import type { PolygonClient } from "../services/massiveClient.js";

export interface AlertBroadcastPayload {
  id: string;
  symbol: string;
  price: number;
  timestamp: number;
  condition: Alert["condition"];
}

export interface AlertEvaluatorOptions {
  pollMs?: number;
  cooldownMs?: number;
}

export class AlertEvaluator {
  private timer?: NodeJS.Timeout;
  private readonly pollMs: number;
  private readonly cooldownMs: number;
  private readonly lastPrices = new Map<string, number>();
  private ticking = false;
  private readonly registry: AlertRegistry;
  private readonly polygonClient: PolygonClient;
  private readonly broadcast: (_payload: AlertBroadcastPayload) => void;

  constructor(
    registry: AlertRegistry,
    polygonClient: PolygonClient,
    broadcast: (payload: AlertBroadcastPayload) => void,
    options: AlertEvaluatorOptions = {}
  ) {
    this.registry = registry;
    this.polygonClient = polygonClient;
    this.broadcast = broadcast;
    this.pollMs = options.pollMs ?? Number(process.env.ALERT_POLL_MS ?? 2000);
    this.cooldownMs = options.cooldownMs ?? Number(process.env.ALERT_COOLDOWN_MS ?? 10_000);
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async tick(): Promise<void> {
    if (this.ticking) {
      return;
    }
    this.ticking = true;

    try {
      const alerts = this.registry.list().filter((alert) => alert.active);
      if (alerts.length === 0) {
        return;
      }

      const symbols = Array.from(new Set(alerts.map((alert) => alert.symbol)));
      const prices = new Map<string, number>();

      const results = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const price = await this.fetchPrice(symbol);
            return price === null ? null : { symbol, price };
          } catch (error) {
            logger.warn("Failed to fetch price for alert", { symbol, error });
            return null;
          }
        })
      );

      for (const result of results) {
        if (result) {
          prices.set(result.symbol, result.price);
        }
      }

      const now = Date.now();
      for (const alert of alerts) {
        const price = prices.get(alert.symbol);
        if (typeof price === "number") {
          this.evaluate(alert, price, now);
          this.lastPrices.set(alert.symbol, price);
        }
      }
    } finally {
      this.ticking = false;
    }
  }

  private evaluate(alert: Alert, price: number, timestamp: number): void {
    const previousPrice = this.lastPrices.get(alert.symbol);
    const shouldTrigger = this.shouldTrigger(alert, price, previousPrice);
    if (!shouldTrigger) return;

    if (alert.lastTriggeredAt && timestamp - alert.lastTriggeredAt < this.cooldownMs) {
      return;
    }

    const updated: Alert = { ...alert, lastTriggeredAt: timestamp };
    this.registry.update(updated);
    this.broadcast({ id: alert.id, symbol: alert.symbol, price, timestamp, condition: alert.condition });
  }

  private shouldTrigger(alert: Alert, price: number, previousPrice?: number): boolean {
    const value = alert.condition.value;
    switch (alert.condition.type) {
      case "priceAbove":
        return price > value;
      case "priceBelow":
        return price < value;
      case "crossesAbove":
        return previousPrice !== undefined && previousPrice <= value && price > value;
      case "crossesBelow":
        return previousPrice !== undefined && previousPrice >= value && price < value;
      default:
        return false;
    }
  }

  private async fetchPrice(symbol: string): Promise<number | null> {
    try {
      const normalized = symbol.trim().toUpperCase();
      const snapshot = (await this.polygonClient.getSnapshot(normalized)) as Record<string, unknown> | null;
      if (!snapshot || typeof snapshot !== "object") {
        return null;
      }
      const lastTrade = (snapshot as { lastTrade?: { p?: number } }).lastTrade;
      if (lastTrade?.p !== undefined) {
        return lastTrade.p;
      }
      const close = (snapshot as { day?: { c?: number }; prevDay?: { c?: number } }).day?.c ?? (snapshot as { prevDay?: { c?: number } }).prevDay?.c;
      if (close !== undefined) {
        return close;
      }
      return null;
    } catch (error) {
      logger.warn("Snapshot fetch failed for alert symbol", { symbol, error });
      return null;
    }
  }
}
