import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { apiClient, type BacktestSharePayload } from "../services/apiClient";
import type { Trade } from "@/types/trade";
import { userMessage } from "../utils/errors";

interface TradeShareProps {
  kind: "trade";
  payload: Trade;
}

interface BacktestShareProps {
  kind: "backtest";
  payload: BacktestSharePayload;
}

type DiscordShareButtonProps = (TradeShareProps | BacktestShareProps) & {
  disabled?: boolean;
  className?: string;
};

export function DiscordShareButton({ kind, payload, disabled, className }: DiscordShareButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleShare = async (): Promise<void> => {
    try {
      setLoading(true);
      if (kind === "trade") {
        await apiClient.shareTradeToDiscord(payload);
      } else {
        await apiClient.shareBacktestToDiscord(payload);
      }
      toast.success("Shared to Discord");
    } catch (error) {
      toast.error(userMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className={className}
      size="sm"
      onClick={() => {
        void handleShare();
      }}
      disabled={disabled || loading}
    >
      <Share2 className="w-4 h-4 mr-2" />
      {loading ? "Sharing..." : "Share to Discord"}
    </Button>
  );
}
