import { useCallback, useEffect, useRef, useState } from "react";
import { alertConditionSchema, type AlertCondition } from "@fancytrader/shared";
import { wsClient, type WSMessage } from "../services/websocketClient";
import { useToast } from "../components/ui/Toast";

export interface AlertEvent {
  id: string;
  symbol: string;
  price: number;
  timestamp: number;
  condition: AlertCondition;
}

const isAlertPayload = (payload: unknown): payload is AlertEvent => {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  if (!("id" in payload) || typeof payload.id !== "string") return false;
  if (!("symbol" in payload) || typeof payload.symbol !== "string") return false;
  if (!("price" in payload) || typeof payload.price !== "number") return false;
  if (!("timestamp" in payload) || typeof payload.timestamp !== "number") return false;
  if (!("condition" in payload)) return false;

  const conditionResult = alertConditionSchema.safeParse(payload.condition);
  if (!conditionResult.success) return false;

  return true;
};

export function useAlerts(limit = 25) {
  const toast = useToast();
  const infoRef = useRef(toast.info);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const seenIdsRef = useRef(new Set<string>());

  useEffect(() => {
    infoRef.current = toast.info;
  }, [toast.info]);

  useEffect(() => {
    const handleMessage = (message: WSMessage): void => {
      if (message.type !== "alert") {
        return;
      }

      const payload = message.payload;
      if (!isAlertPayload(payload)) {
        return;
      }

      if (seenIdsRef.current.has(payload.id)) {
        return;
      }

      seenIdsRef.current.add(payload.id);
      setAlerts((prev) => [payload, ...prev].slice(0, limit));

      const formattedPrice = payload.price.toFixed(2);
      infoRef.current(`${payload.symbol} alert @ ${formattedPrice}`);
    };

    const unsubscribe = wsClient.onMessage(handleMessage);
    return () => {
      unsubscribe();
    };
  }, [limit]);

  const clear = useCallback(() => {
    setAlerts([]);
    seenIdsRef.current.clear();
  }, []);

  return {
    alerts,
    latest: alerts[0] ?? null,
    clear,
  } as const;
}
