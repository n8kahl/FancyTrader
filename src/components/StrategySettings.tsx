import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { 
  Settings, 
  Check, 
  X, 
  TrendingUp, 
  Zap, 
  RefreshCw, 
  Clock,
  BarChart3,
  LineChart
} from "lucide-react";
import { 
  ALL_STRATEGIES, 
  KCU_STRATEGIES, 
  UNIVERSAL_STRATEGIES,
  OPTIONS_STRATEGIES,
  STRATEGY_PRESETS,
  getCategoryLabel,
  type StrategyDefinition,
  type StrategyCategory 
} from "../config/strategies";

interface StrategySettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabledStrategies: string[];
  onStrategiesChange: (strategies: string[]) => void;
}

export function StrategySettings({ 
  open, 
  onOpenChange, 
  enabledStrategies, 
  onStrategiesChange 
}: StrategySettingsProps) {
  
  const [localEnabled, setLocalEnabled] = useState<string[]>(enabledStrategies);

  const isStrategyEnabled = (id: string) => localEnabled.includes(id);

  const toggleStrategy = (id: string) => {
    if (localEnabled.includes(id)) {
      setLocalEnabled(localEnabled.filter(s => s !== id));
    } else {
      setLocalEnabled([...localEnabled, id]);
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = STRATEGY_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setLocalEnabled(preset.enabledStrategies);
    }
  };

  const handleSave = () => {
    onStrategiesChange(localEnabled);
    onOpenChange(false);
  };

  const getCategoryIcon = (category: StrategyCategory) => {
    switch (category) {
      case "KCU_LTP": return <TrendingUp className="w-4 h-4" />;
      case "BREAKOUT": return <Zap className="w-4 h-4" />;
      case "REVERSAL": return <RefreshCw className="w-4 h-4" />;
      case "MOMENTUM": return <BarChart3 className="w-4 h-4" />;
      case "INTRADAY": return <Clock className="w-4 h-4" />;
      case "SWING": return <TrendingUp className="w-4 h-4" />;
      case "OPTIONS": return <LineChart className="w-4 h-4" />;
    }
  };

  const renderStrategyList = (strategies: StrategyDefinition[]) => {
    // Group by category
    const grouped = strategies.reduce((acc, strategy) => {
      if (!acc[strategy.category]) {
        acc[strategy.category] = [];
      }
      acc[strategy.category].push(strategy);
      return acc;
    }, {} as Record<StrategyCategory, StrategyDefinition[]>);

    return Object.entries(grouped).map(([category, strats]) => (
      <div key={category} className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {getCategoryIcon(category as StrategyCategory)}
          <h4 className="text-sm">{getCategoryLabel(category as StrategyCategory)}</h4>
          <Badge variant="outline" className="text-xs">
            {strats.filter(s => isStrategyEnabled(s.id)).length}/{strats.length}
          </Badge>
        </div>
        
        <div className="space-y-2">
          {strats.map((strategy) => (
            <div
              key={strategy.id}
              className="p-3 rounded-lg border border-border/50 bg-card/30 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="text-sm">{strategy.name}</h5>
                    {strategy.validationRules?.requiresPatientCandle && (
                      <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                        PC Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {strategy.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {strategy.timeframes.map((tf) => (
                      <Badge key={tf} variant="outline" className="text-[10px] py-0">
                        {tf}
                      </Badge>
                    ))}
                    {strategy.validationRules?.minimumRR && (
                      <Badge variant="outline" className="text-[10px] py-0 bg-green-500/10 text-green-500 border-green-500/20">
                        Min R:R {strategy.validationRules.minimumRR}:1
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={isStrategyEnabled(strategy.id)}
                  onCheckedChange={() => toggleStrategy(strategy.id)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Strategy Configuration
          </DialogTitle>
          <DialogDescription>
            Enable or disable trading strategies to monitor. Changes apply to all active scans.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Quick Presets */}
          <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border/30">
            <h3 className="text-sm mb-3">Quick Presets</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STRATEGY_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset.id)}
                  className="justify-start h-auto py-2 px-3"
                >
                  <div className="text-left">
                    <p className="text-xs">{preset.name}</p>
                    <p className="text-[10px] text-muted-foreground">{preset.enabledStrategies.length} strategies</p>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Strategy Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="text-xs">
                All ({localEnabled.length}/{ALL_STRATEGIES.length})
              </TabsTrigger>
              <TabsTrigger value="kcu" className="text-xs">
                KCU ({KCU_STRATEGIES.filter(s => isStrategyEnabled(s.id)).length}/{KCU_STRATEGIES.length})
              </TabsTrigger>
              <TabsTrigger value="universal" className="text-xs">
                Universal ({UNIVERSAL_STRATEGIES.filter(s => isStrategyEnabled(s.id)).length}/{UNIVERSAL_STRATEGIES.length})
              </TabsTrigger>
              <TabsTrigger value="options" className="text-xs">
                Options ({OPTIONS_STRATEGIES.filter(s => isStrategyEnabled(s.id)).length}/{OPTIONS_STRATEGIES.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4 mt-4">
              {renderStrategyList(ALL_STRATEGIES)}
            </TabsContent>

            <TabsContent value="kcu" className="space-y-4 mt-4">
              {renderStrategyList(KCU_STRATEGIES)}
            </TabsContent>

            <TabsContent value="universal" className="space-y-4 mt-4">
              {renderStrategyList(UNIVERSAL_STRATEGIES)}
            </TabsContent>

            <TabsContent value="options" className="space-y-4 mt-4">
              {renderStrategyList(OPTIONS_STRATEGIES)}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {localEnabled.length} strategies enabled
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
