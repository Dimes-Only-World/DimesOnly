import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStageInfo, type PlusType } from "@/lib/membershipPricing";

async function fetchSold(type: PlusType): Promise<number> {
  if (type === "silver_plus") {
    const { data } = await supabase.rpc("check_silver_plus_availability");
    return Number((data as any)?.[0]?.current_count ?? 0);
  }
  if (type === "diamond_plus") {
    const { data } = await supabase.rpc("get_diamond_plus_count");
    return Number(data ?? 0);
  }
  const { data } = await (supabase as any)
    .from("business_owner_elite_seat_stats")
    .select("seats_taken")
    .single();
  return Number(data?.seats_taken ?? 0);
}

export function useMembershipStage(type: PlusType) {
  const q = useQuery({
    queryKey: ["membership-stage", type],
    queryFn: () => fetchSold(type),
    refetchInterval: 30000,
  });
  return { ...getStageInfo(type, q.data ?? 0), loading: q.isLoading };
}
