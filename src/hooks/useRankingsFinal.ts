import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface FinalWinner {
  rank: number;
  user_id: string;
  username?: string;
  avatar?: string | null;
  score: number;
  prize: number;
}
export interface RankingsFinal {
  closed: boolean;
  closed_at?: string;
  season?: number;
  winners?: FinalWinner[];
}

/** Reads the frozen end-of-season rankings (set by admin once Diamond Plus sells out). */
export function useRankingsFinal() {
  const [final, setFinal] = useState<RankingsFinal>({ closed: false });
  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings" as any)
      .select("value")
      .eq("key", "rankings_final")
      .maybeSingle();
    setFinal(((data as any)?.value as RankingsFinal) || { closed: false });
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { final, reload, setFinal };
}
