// Staged upgrade pricing. Keep in sync with supabase/functions/_shared/membershipPricing.ts
export type PlusType = "silver_plus" | "diamond_plus" | "business_owner_elite";

export interface PriceStage {
  size: number;
  full: number;
  monthly: number; // x 12 months
}

export const PRICE_STAGES: Record<PlusType, PriceStage[]> = {
  silver_plus: [
    { size: 100, full: 249.99, monthly: 35 },
    { size: 100, full: 499.99, monthly: 65 },
    { size: 100, full: 749.99, monthly: 85 },
  ],
  diamond_plus: [
    { size: 100, full: 149.99, monthly: 25 },
    { size: 100, full: 249.99, monthly: 35 },
    { size: 100, full: 349.99, monthly: 45 },
  ],
  business_owner_elite: [
    { size: 25, full: 15000, monthly: 1350 },
    { size: 25, full: 30000, monthly: 3000 },
    { size: 25, full: 45000, monthly: 5000 },
    { size: 25, full: 60000, monthly: 7000 },
  ],
};

export const PLUS_LABELS: Record<PlusType, string> = {
  silver_plus: "Silver Plus",
  diamond_plus: "Diamond Plus",
  business_owner_elite: "Elite Plus",
};

export interface StageInfo {
  sold: number;
  totalSeats: number;
  remainingOverall: number;
  soldOut: boolean;
  stageIndex: number; // -1 when sold out
  stage: PriceStage | null;
  remainingInStage: number;
  next: PriceStage | null;
}

export function getStageInfo(type: PlusType, soldRaw: number): StageInfo {
  const stages = PRICE_STAGES[type];
  const sold = Math.max(0, Math.floor(soldRaw || 0));
  const totalSeats = stages.reduce((s, x) => s + x.size, 0);
  let cum = 0;
  for (let i = 0; i < stages.length; i++) {
    cum += stages[i].size;
    if (sold < cum) {
      return {
        sold,
        totalSeats,
        remainingOverall: totalSeats - sold,
        soldOut: false,
        stageIndex: i,
        stage: stages[i],
        remainingInStage: cum - sold,
        next: stages[i + 1] ?? null,
      };
    }
  }
  return { sold, totalSeats, remainingOverall: 0, soldOut: true, stageIndex: -1, stage: null, remainingInStage: 0, next: null };
}

export const formatUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: n % 1 === 0 ? 0 : 2 });
