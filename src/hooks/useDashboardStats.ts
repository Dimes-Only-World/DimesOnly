import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface DashboardStats {
  availableEarnings: number;
  totalEarnings: number;
  jackpotTickets: number;
  referrals: number;
}

const EMPTY: DashboardStats = {
  availableEarnings: 0,
  totalEarnings: 0,
  jackpotTickets: 0,
  referrals: 0,
};

const sum = (rows: any[] | null | undefined, key: string) =>
  (rows || []).reduce((acc, row) => acc + Number(row?.[key] || 0), 0);

/**
 * Lightweight KPI loader for the dashboard command bar.
 * Mirrors the math used by the Earnings tab but only fetches the columns needed.
 */
export const useDashboardStats = (
  userId?: string | null,
  username?: string | null,
) => {
  const [stats, setStats] = useState<DashboardStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!userId || !username) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [weekly, tips, payments, tipRefs, payouts, referralCount, tickets, activePool] =
          await Promise.all([
            supabase.from("weekly_earnings").select("amount").eq("user_id", userId),
            supabase
              .from("tips")
              .select("tip_amount")
              .eq("tipped_username", username)
              .eq("status", "completed"),
            supabase
              .from("payments")
              .select("referrer_commission")
              .eq("referred_by", username)
              .not("referrer_commission", "is", null),
            supabase
              .from("tips_transactions")
              .select("referrer_commission")
              .eq("referrer_username", username)
              .eq("payment_status", "completed"),
            supabase
              .from("commission_payouts")
              .select("amount")
              .eq("user_id", userId)
              .eq("payout_status", "completed"),
            supabase.rpc("get_my_referrals_count"),

            supabase
              .from("jackpot_tickets")
              .select("code, pool_id, is_winner")
              .eq("user_id", userId),
            supabase.from("v_jackpot_active_pool").select("pool_id").maybeSingle(),
          ]);

        if (cancelled) return;

        const earned =
          sum(tips.data as any[], "tip_amount") +
          sum(payments.data as any[], "referrer_commission") +
          sum(tipRefs.data as any[], "referrer_commission");
        const weeklyTotal = sum(weekly.data as any[], "amount");
        const totalEarnings = Math.max(earned, weeklyTotal);
        const paidOut = sum(payouts.data as any[], "amount");

        const activePoolId = (activePool.data as any)?.pool_id
          ? String((activePool.data as any).pool_id)
          : null;
        const codes = new Set<string>();
        ((tickets.data as any[]) || []).forEach((t) => {
          if (!t?.code) return;
          const poolKey = t.pool_id ? String(t.pool_id) : "__no_pool__";
          if (activePoolId) {
            if (poolKey === activePoolId) codes.add(String(t.code));
          } else if (!t.is_winner) {
            codes.add(String(t.code));
          }
        });

        let referrals = Number((referralCount as any)?.data) || 0;
        if (!referrals) {
          const { count } = await supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .ilike("referred_by", username);
          referrals = Number(count) || 0;
        }

        setStats({
          totalEarnings,
          availableEarnings: Math.max(0, totalEarnings - paidOut),
          jackpotTickets: codes.size,
          referrals,
        });

      } catch (error) {
        console.warn("Dashboard stats failed to load", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, username]);

  return { stats, loading };
};

export default useDashboardStats;
