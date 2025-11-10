import { useEffect, useMemo, useRef, useState } from "react";
import { getBackendWsUrl } from "../utils/env";
import { createWebSocketClient } from "../services/websocketClient";

export function useBackendConnection() {
  const [connected, setConnected] = useState(false);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const client = useMemo(() => createWebSocketClient(getBackendWsUrl()), []);
  const unsubRef = useRef<() => void>();

  useEffect(() => {
    client.connect();

    unsubRef.current = client.onMessage((msg) => {
      setLastMessage(msg);

      if (msg?.type === "SUBSCRIPTIONS" && Array.isArray(msg.symbols)) {
        setSubscriptions(msg.symbols);
      }

      if (msg?.type === "status" || msg?.type === "STATUS") {
        setConnected(true);
      }
    });

    return () => {
      unsubRef.current?.();
      client.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subscribe = (symbols: string[]) => client.subscribe(symbols);
  const unsubscribe = (symbols: string[]) => client.unsubscribe(symbols);

  return { connected, subscriptions, lastMessage, subscribe, unsubscribe };
}
