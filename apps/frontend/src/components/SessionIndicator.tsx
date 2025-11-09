import { useEffect, useMemo, useState } from "react";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { apiClient, type MarketSessionResponse } from "../services/apiClient";

export type MarketSession = MarketSessionResponse["session"];
type DisplaySession = MarketSession | "mock";

const SESSION_HINTS: Record<MarketSession, string> = {
  premarket: "Scanning premarket; extended-hours data; lower liquidity",
  regular: "Regular session; live streaming + scanners",
  aftermarket: "After-hours; scanning with extended-hours data",
  closed: "Market closed; last-known-good snapshots only",
};

const SESSION_BADGE_STYLES: Record<DisplaySession, string> = {
  premarket: "bg-blue-500/10 text-blue-300 border-blue-400/30",
  regular: "bg-green-500/10 text-green-300 border-green-400/40",
  aftermarket: "bg-purple-500/10 text-purple-300 border-purple-400/30",
  closed: "bg-slate-500/10 text-slate-300 border-slate-400/30",
  mock: "bg-orange-500/10 text-orange-300 border-orange-400/30",
};

const MOCK_HINT = "Using mock data; session tracking paused";

export interface SessionIndicatorProps {
  mock?: boolean;
}

export function SessionIndicator({ mock = false }: SessionIndicatorProps) {
  const [session, setSession] = useState<DisplaySession>(mock ? "mock" : "closed");
  const [hint, setHint] = useState<string>(mock ? MOCK_HINT : SESSION_HINTS.closed);

  useEffect(() => {
    let mounted = true;

    if (mock) {
      setSession("mock");
      setHint(MOCK_HINT);
      return () => {
        mounted = false;
      };
    }

    const load = async () => {
      try {
        const status = await apiClient.getMarketStatus();
        if (!mounted) return;
        const nextSession = (status.session ?? "closed") as MarketSession;
        setSession(nextSession);
        setHint(SESSION_HINTS[nextSession]);
      } catch {
        if (mounted) {
          setSession("closed");
          setHint("Unable to fetch session data; assuming closed session");
        }
      }
    };

    load();
    const id = window.setInterval(load, 15_000);

    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [mock]);

  const label = useMemo(() => {
    if (session === "mock") {
      return "Mock";
    }
    return session.charAt(0).toUpperCase() + session.slice(1);
  }, [session]);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            aria-label="session-indicator"
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium ${SESSION_BADGE_STYLES[session]}`}
          >
            <span className="text-muted-foreground/80">Session:</span>
            <span>{label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-sm">{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
