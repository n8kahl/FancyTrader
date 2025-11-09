import type { AlertCondition } from "@fancytrader/shared";

export interface Alert {
  id: string;
  symbol: string;
  condition: AlertCondition;
  active: boolean;
  lastTriggeredAt?: number;
}

const randomId = (): string =>
  (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).toUpperCase();

export class AlertRegistry {
  private readonly alerts = new Map<string, Alert>();

  add(symbol: string, condition: AlertCondition): Alert {
    const alert: Alert = {
      id: randomId(),
      symbol: symbol.trim().toUpperCase(),
      condition,
      active: true,
    };
    this.alerts.set(alert.id, alert);
    return alert;
  }

  remove(id: string): boolean {
    return this.alerts.delete(id);
  }

  list(): Alert[] {
    return Array.from(this.alerts.values());
  }

  update(alert: Alert): void {
    this.alerts.set(alert.id, alert);
  }
}
