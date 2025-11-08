import { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Clock, TrendingUp, AlertCircle, Activity } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface MarketPhase {
  phase: "PRE_MARKET" | "ORB_FORMING" | "POST_10" | "CLOUD_WINDOW" | "CLOSE";
  currentTime: string; // e.g., "09:45 ET"
}

interface MarketPhaseIndicatorProps {
  marketPhase?: MarketPhase;
  dayType?: "TREND" | "CHOP" | "UNKNOWN";
  event?: "FOMC" | "CPI" | "EARNINGS" | null;
}

// Helper function to get current market phase based on time
function getCurrentMarketPhase(): MarketPhase {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ET`;

  // Convert to minutes since midnight for easier comparison
  const currentMinutes = hours * 60 + minutes;

  // Market hours in ET (assuming local time is ET for demo purposes)
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const orbEnd = 9 * 60 + 45; // 9:45 AM
  const cloudStart = 13 * 60; // 1:00 PM
  const cloudEnd = 15 * 60; // 3:00 PM
  const marketClose = 16 * 60; // 4:00 PM

  let phase: MarketPhase["phase"];

  if (currentMinutes < marketOpen) {
    phase = "PRE_MARKET";
  } else if (currentMinutes < orbEnd) {
    phase = "ORB_FORMING";
  } else if (currentMinutes < cloudStart) {
    phase = "POST_10";
  } else if (currentMinutes < cloudEnd) {
    phase = "CLOUD_WINDOW";
  } else if (currentMinutes < marketClose) {
    phase = "POST_10";
  } else {
    phase = "CLOSE";
  }

  return {
    phase,
    currentTime: timeString,
  };
}

export function MarketPhaseIndicator({
  marketPhase: propMarketPhase,
  dayType,
  event,
}: MarketPhaseIndicatorProps) {
  const [currentPhase, setCurrentPhase] = useState<MarketPhase>(
    () => propMarketPhase || getCurrentMarketPhase()
  );

  useEffect(() => {
    if (propMarketPhase) {
      setCurrentPhase(propMarketPhase);
      return;
    }

    // Update every minute if no prop provided
    const interval = setInterval(() => {
      setCurrentPhase(getCurrentMarketPhase());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [propMarketPhase]);

  const marketPhase = propMarketPhase || currentPhase;
  const getPhaseInfo = () => {
    switch (marketPhase.phase) {
      case "PRE_MARKET":
        return {
          label: "Pre-Market",
          color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
          icon: Clock,
          description: "Identifying levels on 60m chart. ORB forms at 09:30 ET.",
        };
      case "ORB_FORMING":
        return {
          label: "ORB Forming (First 15m)",
          color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
          icon: Activity,
          description:
            "Opening Range Breakout forming. King & Queen setups available after 09:40 ET.",
        };
      case "POST_10":
        return {
          label: "Active Trading",
          color: "bg-green-500/10 text-green-500 border-green-500/20",
          icon: TrendingUp,
          description:
            "VWAP strategies now active. All setups available. 10m trend clarity on SPX after 11:00 ET.",
        };
      case "CLOUD_WINDOW":
        return {
          label: "Cloud Window",
          color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
          icon: Activity,
          description:
            "Cloud Strategy window (13:00-15:00 ET). Prefer if morning trended. Algos around 12:55 ET.",
        };
      case "CLOSE":
        return {
          label: "Market Closing",
          color: "bg-slate-500/10 text-slate-500 border-slate-500/20",
          icon: Clock,
          description: "Market closing soon. Review trades and prepare journal entries.",
        };
      default:
        return {
          label: "Unknown",
          color: "bg-gray-500/10 text-gray-500 border-gray-500/20",
          icon: AlertCircle,
          description: "Market phase unknown",
        };
    }
  };

  const phaseInfo = getPhaseInfo();
  const PhaseIcon = phaseInfo.icon;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`${phaseInfo.color} cursor-help`}>
              <PhaseIcon className="w-3 h-3 mr-1.5" />
              {phaseInfo.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{phaseInfo.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border/50">
        <Clock className="w-3 h-3 mr-1.5" />
        {marketPhase.currentTime}
      </Badge>

      {dayType && dayType !== "UNKNOWN" && (
        <Badge variant="outline" className="bg-muted/30 text-muted-foreground border-border/40">
          <TrendingUp className="w-3 h-3 mr-1.5" />
          {dayType} Day
        </Badge>
      )}

      {event && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="bg-red-500/10 text-red-500 border-red-500/20 cursor-help animate-pulse"
              >
                <AlertCircle className="w-3 h-3 mr-1.5" />
                {event} TODAY
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                {event === "FOMC"
                  ? "FOMC Decision Day: Usually chop until 14:00 ET. Consider waiting 14:25-14:35 for PC with clear stop. Many traders skip FOMC days."
                  : `${event} Release: Increased volatility expected. Exercise caution and ensure proper risk management.`}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
