import { useEffect, useState } from "react";
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

// Plain React state (no React Query) so it works anywhere in the app tree.
export function useMembershipStage(type: PlusType) {
  const [sold, setSold] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchSold(type)
        .then((n) => !cancelled && setSold(n))
        .catch(() => !cancelled && setSold((s) => s ?? 0));
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [type]);

  return { ...getStageInfo(type, sold ?? 0), loading: sold === null };
}
