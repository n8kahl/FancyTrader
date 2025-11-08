import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Send, CheckCircle2 } from "lucide-react";
import type { Trade } from "@/types/trade";
import { toast } from "sonner";

interface DiscordAlertDialogProps {
  trade: Trade | null;
  isOpen: boolean;
  onClose: () => void;
  onSend?: (payload: { channel: string; content: string }) => void;
}

export function DiscordAlertDialog({ trade, isOpen, onClose, onSend }: DiscordAlertDialogProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!trade) return null;

  const price = trade.price ?? trade.currentPrice ?? trade.entryPrice ?? 0;
  const change = trade.change ?? 0;
  const changePercent = trade.changePercent ?? 0;
  const entryPrice = trade.entry ?? trade.entryPrice ?? 0;
  const targetPrice = trade.target ?? trade.targets?.[0] ?? 0;
  const stopPrice = trade.stop ?? trade.stopLoss ?? 0;
  const riskReward = trade.riskReward ?? "N/A";
  const confluenceScore = trade.confluenceScore ?? 0;
  const conviction = trade.conviction ?? "MEDIUM";
  const dayType = trade.dayType ?? "Unknown";
  const timeframe = trade.timeframe ?? "N/A";
  const confluenceDetails = trade.confluenceDetails ?? {};
  const patientCandle = trade.patientCandle;

  // Generate default message based on trade details
  const getDefaultMessage = (): string => {
    const confluenceList: string[] = [];

    if (confluenceDetails.orbLine) confluenceList.push('ORB');
    if (confluenceDetails.vwap) confluenceList.push('VWAP');
    if (confluenceDetails.ema8) confluenceList.push('8-EMA');
    if (confluenceDetails.ema21) confluenceList.push('21-EMA');
    if (confluenceDetails.openPrice) confluenceList.push('Open');
    if (confluenceDetails.hourlyLevel) confluenceList.push('Hourly');
    if (confluenceDetails.sma200) confluenceList.push('200');
    if (confluenceDetails.fibonacci) confluenceList.push(`Fib ${confluenceDetails.fibonacci}`);

    const confluenceText = confluenceList.length > 0 ? confluenceList.join(', ') : 'N/A';
    const pcStatus = patientCandle?.isContained ? '✓ PC Contained' : '⚠️ PC Not Contained';

    let pcDetails = '';
    if (patientCandle) {
      const pcSize = Math.abs(patientCandle.pcHigh - patientCandle.pcLow);
      const stopDistance = Math.abs(entryPrice - stopPrice);
      pcDetails = `• Size: ${pcSize.toFixed(2)} pts
• Stop Distance: ${stopDistance.toFixed(2)} pts`;
    }

    const warningBanner =
      trade.warnings && Object.values(trade.warnings).some((v) => v)
        ? `⚠️ **Warnings:**
${trade.warnings.sma200Headwind ? '• 200 SMA headwind ahead\n' : ''}${trade.warnings.chopDay ? '• ORB indicates chop day\n' : ''}${trade.warnings.preVWAPTime ? '• VWAP setup before 10:00 ET\n' : ''}${trade.warnings.poorRiskReward ? '• R:R below 1:2 minimum\n' : ''}${trade.warnings.pcInvalid ? '• PC not contained\n' : ''}`
        : '';

    const pricePrefix = change >= 0 ? '+' : '';

    return `🎯 **${trade.symbol} - ${trade.setup}**

**Status:** ${trade.status.replace('_', ' ')}
**Day Type:** ${dayType}
**Conviction:** ${conviction}
**Timeframe:** ${timeframe}

**Levels:**
• Entry: $${entryPrice.toFixed(2)}
• Target: $${targetPrice.toFixed(2)}
• Stop: $${stopPrice.toFixed(2)}
• R:R: ${riskReward}

**Confluence (${confluenceScore}/10):**
${confluenceText}

**Patient Candle:**
${pcStatus}
${pcDetails}

**Current Price:** $${price.toFixed(2)} (${pricePrefix}${changePercent.toFixed(2)}%)

${warningBanner}
📊 Trade Responsibly | Follow Your Plan`;
  };

  const handleSend = async () => {
    setSending(true);
    const content = message || getDefaultMessage();

    // Simulate sending to Discord
    await new Promise((resolve) => setTimeout(resolve, 1500));

    onSend?.({ channel: "discord", content });

    setSending(false);
    setSent(true);

    toast.success(`Alert sent for ${trade.symbol}`, {
      description: "Students have been notified via Discord",
    });

    setTimeout(() => {
      setSent(false);
      setMessage("");
      onClose();
    }, 2000);
  };

  const handleOpen = (open: boolean) => {
    if (!open) {
      setSent(false);
      setMessage("");
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpen}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-500" />
            Send Discord Alert
          </AlertDialogTitle>
          <AlertDialogDescription>
            Send a trade update to your students via Discord for{" "}
            <span className="text-foreground">{trade.symbol}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!sent ? (
          <div className="space-y-4">
            {/* Trade Summary */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg">{trade.symbol}</h3>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className={
                      trade.status === "ACTIVE"
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                    }
                  >
                    {trade.status.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      conviction === "HIGH"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : conviction === "MEDIUM"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                    }
                  >
                    {conviction}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{trade.setup}</p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Entry</p>
                  <p className="text-green-500">${entryPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Target</p>
                  <p className="text-blue-500">${targetPrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Stop</p>
                  <p className="text-red-500">${stopPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <label className="text-sm">Alert Message</label>
              <Textarea
                placeholder={getDefaultMessage()}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[300px] font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use default message template
              </p>
            </div>

            {/* Preview */}
            <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
              <p className="text-xs text-indigo-400 mb-2">Preview:</p>
              <div className="text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                {message || getDefaultMessage()}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-center">
              <p className="text-lg">Alert Sent Successfully!</p>
              <p className="text-sm text-muted-foreground">Students have been notified</p>
            </div>
          </div>
        )}

        {!sent && (
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => handleOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send to Discord
                </>
              )}
            </Button>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
