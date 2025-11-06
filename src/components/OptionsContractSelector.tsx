import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { 
  TrendingUp, 
  TrendingDown,
  Target,
  DollarSign,
  Percent
} from "lucide-react";
import { type Trade } from "./TradeCard";
import { type OptionsContract } from "../types/options";

interface OptionsContractSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: Trade;
  onSelectContract: (contract: OptionsContract) => void;
}

// Generate mock options contracts
function generateContracts(
  symbol: string,
  currentPrice: number,
  targetPrice: number,
  conviction: string,
  direction: "LONG" | "SHORT"
): { itm: OptionsContract[], otm: OptionsContract[] } {
  const isCall = direction === "LONG";
  const contracts: OptionsContract[] = [];
  
  // Generate strikes at different distances from current price
  const distances = [-7.5, -5, -2.5, 2.5, 5, 7.5]; // Percentages
  
  // Generate 3 expirations: 1 week, 2 weeks, 1 month
  const expirations = [
    { days: 7, display: "Dec 15" },
    { days: 14, display: "Dec 22" },
    { days: 30, display: "Jan 5" },
  ];

  // Use the first expiration for simplicity (can expand later)
  const exp = expirations[1]; // 2 weeks
  
  distances.forEach(distPercent => {
    const strike = currentPrice * (1 + distPercent / 100);
    const roundedStrike = Math.round(strike / 0.5) * 0.5; // Round to nearest 0.5
    
    const isITM = isCall ? roundedStrike < currentPrice : roundedStrike > currentPrice;
    const absDistance = Math.abs(distPercent);
    
    // Calculate premium based on distance and time
    let premium: number;
    if (isITM) {
      // ITM: Intrinsic value + time value
      const intrinsic = isCall ? 
        Math.max(0, currentPrice - roundedStrike) : 
        Math.max(0, roundedStrike - currentPrice);
      const timeValue = intrinsic * 0.15; // Rough estimate
      premium = intrinsic + timeValue;
    } else {
      // OTM: Pure time value, decreases with distance
      premium = (currentPrice * 0.05) * (1 - absDistance / 10) * (exp.days / 30);
    }
    
    premium = Math.max(0.05, premium); // Minimum $0.05
    
    // Calculate delta (simplified)
    let delta: number;
    if (isCall) {
      if (isITM) delta = 0.5 + (absDistance / 20);
      else delta = 0.5 - (absDistance / 20);
      delta = Math.min(0.95, Math.max(0.05, delta));
    } else {
      if (isITM) delta = -0.5 - (absDistance / 20);
      else delta = -0.5 + (absDistance / 20);
      delta = Math.max(-0.95, Math.min(-0.05, delta));
    }
    
    // Calculate projected profit if stock hits target
    let projectedProfit = 0;
    let projectedProfitPercent = 0;
    
    if (targetPrice) {
      const stockMove = targetPrice - currentPrice;
      const contractMove = stockMove * Math.abs(delta);
      const newPremium = premium + contractMove;
      projectedProfit = (newPremium - premium) * 100; // Per contract
      projectedProfitPercent = ((newPremium - premium) / premium) * 100;
    }
    
    contracts.push({
      symbol,
      strike: roundedStrike,
      type: isCall ? "CALL" : "PUT",
      expiration: new Date(Date.now() + exp.days * 24 * 60 * 60 * 1000).toISOString(),
      expirationDisplay: exp.display,
      daysToExpiry: exp.days,
      premium: Math.round(premium * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      breakEven: isCall ? roundedStrike + premium : roundedStrike - premium,
      isITM,
      distanceFromPrice: distPercent,
      projectedProfit: Math.round(projectedProfit),
      projectedProfitPercent: Math.round(projectedProfitPercent),
    });
  });
  
  // Separate ITM and OTM
  const itm = contracts.filter(c => c.isITM).sort((a, b) => 
    isCall ? b.strike - a.strike : a.strike - b.strike
  ).slice(0, 3);
  
  const otm = contracts.filter(c => !c.isITM).sort((a, b) => 
    isCall ? a.strike - b.strike : b.strike - a.strike
  ).slice(0, 3);
  
  return { itm, otm };
}

function ContractCard({ 
  contract, 
  isRecommended,
  onSelect 
}: { 
  contract: OptionsContract;
  isRecommended: boolean;
  onSelect: () => void;
}) {
  const isProfitable = contract.projectedProfit && contract.projectedProfit > 0;
  
  return (
    <div 
      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${
        isRecommended 
          ? 'border-indigo-500 bg-indigo-500/5' 
          : 'border-border/50 bg-card/20 hover:border-border'
      }`}
      onClick={onSelect}
    >
      {isRecommended && (
        <Badge className="absolute -top-2 -right-2 bg-indigo-600">
          Recommended
        </Badge>
      )}
      
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono">${contract.strike}</span>
            <Badge variant={contract.type === "CALL" ? "default" : "secondary"} className="text-[10px]">
              {contract.type}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {contract.isITM ? "ITM" : "OTM"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{contract.expirationDisplay}</p>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            <span>${contract.premium.toFixed(2)}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">per contract</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <Percent className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Delta:</span>
          <span>{contract.delta.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Break-even:</span>
          <span>${contract.breakEven.toFixed(2)}</span>
        </div>
      </div>
      
      {contract.projectedProfit !== undefined && (
        <div className={`mt-3 pt-3 border-t border-border/30 ${
          isProfitable ? 'text-green-500' : 'text-red-500'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">If target hit:</span>
            <div className="flex items-center gap-1">
              {isProfitable ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>${Math.abs(contract.projectedProfit).toFixed(0)}</span>
              <span>({contract.projectedProfitPercent > 0 ? '+' : ''}{contract.projectedProfitPercent}%)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function OptionsContractSelector({ 
  open, 
  onOpenChange, 
  trade,
  onSelectContract 
}: OptionsContractSelectorProps) {
  const direction: "LONG" | "SHORT" = trade.patientCandle?.direction || "LONG";
  
  const { itm, otm } = useMemo(() => 
    generateContracts(
      trade.symbol,
      trade.price,
      trade.target,
      trade.conviction,
      direction
    ),
    [trade.symbol, trade.price, trade.target, trade.conviction, direction]
  );
  
  // Recommend based on conviction
  const getRecommendedIndex = (contracts: OptionsContract[]) => {
    if (trade.conviction === "HIGH") return 0; // Closest to money
    if (trade.conviction === "MEDIUM") return 1; // Middle
    return 2; // Furthest for LOW conviction
  };
  
  const recommendedOTM = getRecommendedIndex(otm);
  
  const handleSelectContract = (contract: OptionsContract) => {
    onSelectContract(contract);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Select Options Contract - {trade.symbol}
          </DialogTitle>
          <DialogDescription>
            Choose the best contract for this {trade.setup} setup.
          </DialogDescription>
        </DialogHeader>
        
        {/* Trade Summary */}
        <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
          <div>
            <p className="text-xs text-muted-foreground">Current</p>
            <p className="text-lg">${trade.price.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Target</p>
            <p className="text-lg text-green-500">${trade.target.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Stop</p>
            <p className="text-lg text-red-500">${trade.stop.toFixed(2)}</p>
          </div>
        </div>
        
        {/* Contracts Display */}
        <Tabs defaultValue="otm" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="otm">OTM Contracts</TabsTrigger>
            <TabsTrigger value="itm">ITM Contracts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="otm" className="mt-3">
            <ScrollArea className="h-[400px] pr-3">
              <div className="grid gap-3">
                {otm.map((contract, idx) => (
                  <ContractCard
                    key={`${contract.strike}-${contract.type}`}
                    contract={contract}
                    isRecommended={idx === recommendedOTM}
                    onSelect={() => handleSelectContract(contract)}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="itm" className="mt-3">
            <ScrollArea className="h-[400px] pr-3">
              <div className="grid gap-3">
                {itm.map((contract) => (
                  <ContractCard
                    key={`${contract.strike}-${contract.type}`}
                    contract={contract}
                    isRecommended={false}
                    onSelect={() => handleSelectContract(contract)}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
