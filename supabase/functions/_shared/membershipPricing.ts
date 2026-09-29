// Staged upgrade pricing. Keep in sync with src/lib/membershipPricing.ts
// deno-lint-ignore-file no-explicit-any
export type PlusType = "silver_plus" | "diamond_plus" | "business_owner_elite";
interface PriceStage { size: number; full: number; monthly: number }

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

export function stageFor(type: PlusType, sold: number): PriceStage | null {
  let cum = 0;
  for (const s of PRICE_STAGES[type]) {
    cum += s.size;
    if (sold < cum) return s;
  }
  return null;
}

export async function countSold(supabase: any, type: PlusType): Promise<number> {
  if (type === "silver_plus") {
    const { data } = await supabase.rpc("check_silver_plus_availability");
    return Number(data?.[0]?.current_count ?? 0);
  }
  if (type === "diamond_plus") {
    const { data } = await supabase.rpc("get_diamond_plus_count");
    return Number(data ?? 0);
  }
  const { data } = await supabase.from("business_owner_elite_seat_stats").select("seats_taken").single();
  return Number(data?.seats_taken ?? 0);
}
