import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  TrendingUp,
  TrendingDown,
  Send,
  Plus,
  Minus,
  Shield,
  Target,
  X,
  MessageSquare,
  History,
  XCircle,
} from "lucide-react";
import type { Trade, TradeAlert } from "@/types/trade";
import {
  type AlertType,
  type PositionTracking,
  type OptionsContract,
  getContractDisplay,
  ALERT_TEMPLATES,
} from "../types/options";
import { Textarea } from "./ui/textarea";

interface ActionPayload extends Record<string, unknown> {
  newStop?: number;
}

interface TradeProgressManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: Trade;
  contract: OptionsContract;
  position: PositionTracking;
  alertHistory: TradeAlert[];
  onSendAlert: (
    type: AlertType,
    message: string,
    data?: Record<string, unknown>
  ) => void;
  onUpdateTradeState: (tradeId: string, newState: Trade["tradeState"]) => void;
  onDismissTrade?: (tradeId: string) => void;
}

export function TradeProgressManager({
  open,
  onOpenChange,
  trade,
  contract,
  position,
  alertHistory,
  onSendAlert,
  onUpdateTradeState,
  onDismissTrade,
}: TradeProgressManagerProps) {
  const conviction = trade.conviction ?? "MEDIUM";
  const stopPrice = trade.stop ?? trade.stopLoss ?? trade.entry ?? contract.strike;

  const [selectedAction, setSelectedAction] = useState<AlertType | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [inputValue, setInputValue] = useState("");

  // Calculate real-time P&L
  const profitColor = position.totalPL >= 0 ? "text-green-500" : "text-red-500";
  const profitIcon = position.totalPL >= 0 ? TrendingUp : TrendingDown;
  const ProfitIcon = profitIcon;

  const handleActionClick = (action: AlertType) => {
    setSelectedAction(action);
    const template = ALERT_TEMPLATES[action];

    // Pre-fill message with template
    const message = template.defaultMessage
      .replace("{symbol}", trade.symbol)
      .replace("{contract}", getContractDisplay(contract))
      .replace("{strike}", contract.strike.toFixed(2))
      .replace("{premium}", position.currentPremium.toFixed(2))
      .replace("{expiration}", contract.expirationDisplay)
      .replace("{setup}", trade.setup)
      .replace("{conviction}", conviction)
      .replace("{target}", contract.breakEven.toFixed(2))
      .replace("{stop}", stopPrice.toFixed(2))
      .replace("{profit}", position.totalPLPercent.toFixed(1));

    setCustomMessage(message);
    setInputValue("");
  };

  const handleSendAlert = () => {
    if (!selectedAction) return;

    let finalMessage = customMessage;
    const template = ALERT_TEMPLATES[selectedAction];

    // Handle actions that need additional input
    const actionData: ActionPayload = {};

    if (template.requiresInput && inputValue) {
      if (selectedAction === "STOP_ADJUST") {
        finalMessage = finalMessage.replace("{newStop}", inputValue);
        actionData.newStop = parseFloat(inputValue);
      } else if (selectedAction === "CUSTOM") {
        // CUSTOM uses the textarea directly
      }
    }

    // Send the alert
    const payload: Record<string, unknown> | undefined =
      Object.keys(actionData).length > 0 ? { ...actionData } : undefined;
    onSendAlert(selectedAction, finalMessage, payload);

    // Update trade state based on action
    if (selectedAction === "ENTRY") {
      onUpdateTradeState(trade.id, "ENTERED");
    } else if (selectedAction === "EXIT_ALL") {
      onUpdateTradeState(trade.id, "CLOSED");
    }

    setSelectedAction(null);
    setCustomMessage("");
    setInputValue("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Trade Progress - {trade.symbol}
          </DialogTitle>
          <DialogDescription>
            Manage your position, send alerts, and track trade progress
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Position Status & Actions */}
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Contract Info */}
            <div className="p-4 rounded-lg border border-border/50 bg-card/30">
              <p className="text-xs text-muted-foreground mb-2">Active Contract</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono">
                    {trade.symbol} ${contract.strike}
                    {contract.type === "CALL" ? "C" : "P"}
                  </p>
                  <p className="text-xs text-muted-foreground">{contract.expirationDisplay}</p>
                </div>
                <Badge variant="outline">
                  {(position.positionSize * 100).toFixed(0)}% Position
                </Badge>
              </div>
            </div>

            {/* P&L Display */}
            <div className="p-4 rounded-lg border-2 border-border/50 bg-gradient-to-br from-card/50 to-muted/20">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Current Position P&L</p>
                <ProfitIcon className={`w-5 h-5 ${profitColor}`} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
                  <p className={`text-2xl ${profitColor}`}>
                    ${Math.abs(position.totalPL).toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Percent</p>
                  <p className={`text-2xl ${profitColor}`}>
                    {position.totalPLPercent > 0 ? "+" : ""}
                    {position.totalPLPercent.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs border-t border-border/30 pt-3">
                <div>
                  <p className="text-muted-foreground mb-1">Entry</p>
                  <p>${position.entryPremium.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Current</p>
                  <p>${position.currentPremium.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Unrealized</p>
                  <p className={position.unrealizedPL >= 0 ? "text-green-500" : "text-red-500"}>
                    ${position.unrealizedPL.toFixed(0)}
                  </p>
                </div>
              </div>

              {position.realizedPL !== 0 && (
                <div className="mt-3 pt-3 border-t border-border/30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Realized P&L:</span>
                    <span className={position.realizedPL >= 0 ? "text-green-500" : "text-red-500"}>
                      ${position.realizedPL.toFixed(0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <h3 className="text-sm mb-3">Trade Actions</h3>
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {trade.tradeState === "LOADED" && (
                    <Button
                      variant="default"
                      className="w-full justify-start bg-green-600 hover:bg-green-700"
                      onClick={() => handleActionClick("ENTRY")}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Enter Position
                    </Button>
                  )}

                  {trade.tradeState !== "LOADED" && (
                    <>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleActionClick("TRIM_25")}
                      >
                        <Minus className="w-4 h-4 mr-2" />
                        Trim 25% of Position
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleActionClick("TRIM_50")}
                      >
                        <Minus className="w-4 h-4 mr-2" />
                        Trim 50% of Position
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleActionClick("ADD")}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add to Position
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleActionClick("STOP_ADJUST")}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Adjust Stop Loss
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleActionClick("TARGET_HIT")}
                      >
                        <Target className="w-4 h-4 mr-2 text-green-500" />
                        Target Hit
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full justify-start text-red-500 hover:text-red-600"
                        onClick={() => handleActionClick("EXIT_ALL")}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Exit All
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleActionClick("CUSTOM")}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Custom Message
                  </Button>

                  {onDismissTrade && (
                    <div className="pt-4 mt-4 border-t border-border/30">
                      <Button
                        variant="outline"
                        className="w-full justify-start text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                        onClick={() => {
                          if (
                            confirm(
                              `Are you sure you want to dismiss this trade? This will remove ${trade.symbol} from your active trades.`
                            )
                          ) {
                            onDismissTrade(trade.id);
                            onOpenChange(false);
                          }
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Dismiss Trade
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Right: Alert Composer */}
          <div className="flex flex-col gap-4 overflow-hidden">
            {selectedAction ? (
              <>
                <div className="p-4 rounded-lg border border-border/50 bg-muted/30">
                  <h3 className="text-sm mb-2">Edit Alert Message</h3>
                  <Badge variant="outline" className="text-xs">
                    {ALERT_TEMPLATES[selectedAction].type.replace("_", " ")}
                  </Badge>
                </div>

                {ALERT_TEMPLATES[selectedAction].requiresInput && selectedAction !== "CUSTOM" && (
                  <div className="space-y-2">
                    <Label htmlFor="input-value">
                      {ALERT_TEMPLATES[selectedAction].inputLabel}
                    </Label>
                    <Input
                      id="input-value"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Enter value..."
                    />
                  </div>
                )}

                <div className="flex-1 overflow-hidden flex flex-col">
                  <Label htmlFor="message" className="mb-2">
                    Message Preview
                  </Label>
                  <Textarea
                    id="message"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="flex-1 font-mono text-xs resize-none"
                    placeholder="Compose your alert..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSendAlert}
                    disabled={!customMessage.trim()}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send to Discord
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedAction(null);
                      setCustomMessage("");
                      setInputValue("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 rounded-lg border border-border/50 bg-muted/30 flex items-center justify-center h-32">
                  <p className="text-sm text-muted-foreground text-center">
                    Select an action to compose an alert
                  </p>
                </div>

                {/* Alert History */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm">Alert History</h3>
                    <Badge variant="outline" className="text-xs">
                      {alertHistory.length}
                    </Badge>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="space-y-3">
                      {alertHistory.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">
                          No alerts sent yet
                        </p>
                      ) : (
                        alertHistory.map((alert) => (
                          <div
                            key={alert.id}
                            className="p-3 rounded-lg border border-border/50 bg-card/20"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline" className="text-[10px]">
                                {alert.type.replace("_", " ")}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(alert.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <pre className="text-[10px] font-mono whitespace-pre-wrap text-foreground/90 leading-relaxed">
                              {alert.message}
                            </pre>
                            {alert.contractPrice && (
                              <div className="mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground">
                                Contract Price: ${alert.contractPrice.toFixed(2)}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
