// Flexible confluence system for strategy-specific factors

export type ConfluenceStrength = "HIGH" | "MEDIUM" | "LOW";

export interface ConfluenceFactor {
  factor: string;           // Name: "RVOL", "IVP", "Pattern", "8-EMA", etc.
  value: string | number;   // "3.2x", "+18%", "Bullish", "Aligned", 0.382
  strength: ConfluenceStrength;  // Quality/conviction of this factor
  present: boolean;         // Is this factor active/met?
  description?: string;     // Optional tooltip/detail
}

// Helper to create confluence factors
export function createConfluenceFactor(
  factor: string,
  value: string | number,
  strength: ConfluenceStrength,
  present: boolean = true,
  description?: string
): ConfluenceFactor {
  return { factor, value, strength, present, description };
}

// Calculate overall confluence score from factors
export function calculateConfluenceScore(factors: ConfluenceFactor[]): number {
  const activeFactors = factors.filter(f => f.present);
  if (activeFactors.length === 0) return 0;
  
  const strengthWeights = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const totalWeight = activeFactors.reduce((sum, f) => sum + strengthWeights[f.strength], 0);
  const maxWeight = activeFactors.length * 3; // If all were HIGH
  
  return Math.round((totalWeight / maxWeight) * 10);
}

// Get display color for strength
export function getStrengthColor(strength: ConfluenceStrength): string {
  switch (strength) {
    case "HIGH": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "MEDIUM": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "LOW": return "text-gray-400 bg-gray-500/10 border-gray-500/20";
  }
}

// Format confluence value for display
export function formatConfluenceValue(value: string | number): string {
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return value;
}
