import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface DashboardStats {
  availableEarnings: number;
  totalEarnings: number;
  jackpotTickets: number;
  referrals: number;
  rentalCommissions: number;
  tipsEarned: number;
  tipOverrides: number;
  eventEarnings: number;
  eventCommissions: number;
  eventOverrides: number;
}

const EMPTY: DashboardStats = {
  availableEarnings: 0,
  totalEarnings: 0,
  jackpotTickets: 0,
  referrals: 0,
  rentalCommissions: 0,
  tipsEarned: 0,
  tipOverrides: 0,
  eventEarnings: 0,
  eventCommissions: 0,
  eventOverrides: 0,
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
        const COMMISSION_TYPES = [
          "subscription_referral_commission",
          "subscription_upline_referral_commission",
          "referral_commission",
          "upline_referral_commission",
          "diamond_plus_referral_commission",
          "diamond_plus_upline_referral_commission",
          "elite_plus_referral_commission",
          "elite_plus_upline_referral_commission",
          "tip_referral_commission",
          "tip_upline_referral_commission",
        ];

        const [weekly, tips, payments, tipRefs, payouts, referralCount, tickets, activePool, rentals, eventEarn] =
          await Promise.all([
            supabase.from("weekly_earnings").select("amount").eq("user_id", userId),
            supabase
              .from("tips")
              .select("tip_amount")
              .ilike("tipped_username", username)
              .eq("status", "completed"),
            // Commission earnings are recorded as payments rows owned by the earner
            supabase
              .from("payments")
              .select("amount, payment_type")
              .eq("user_id", userId)
              .in("payment_type", COMMISSION_TYPES),
            supabase
              .from("tips_transactions")
              .select("referrer_commission")
              .ilike("referrer_username", username)
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
            (supabase as any)
              .from("rental_commissions")
              .select("amount")
              .eq("user_id", userId),
            (supabase as any)
              .from("event_owner_earnings")
              .select("amount, earnings_type")
              .eq("user_id", userId),
          ]);


        if (cancelled) return;

        const rentalCommissions = sum((rentals as any)?.data as any[], "amount");
        const tipsEarned = sum(tips.data as any[], "tip_amount");
        const tipOverrides = sum(tipRefs.data as any[], "referrer_commission");
        const eventRows = (((eventEarn as any)?.data as any[]) || []);
        const isOverride = (t: any) =>
          String(t || "").toLowerCase().includes("override") ||
          String(t || "").toLowerCase().includes("upline");
        const eventOverrides = sum(
          eventRows.filter((r) => isOverride(r?.earnings_type)),
          "amount",
        );
        const eventCommissions = sum(
          eventRows.filter((r) => !isOverride(r?.earnings_type)),
          "amount",
        );
        const eventEarnings = eventCommissions + eventOverrides;
        const earned =
          rentalCommissions +
          eventEarnings +
          tipsEarned +
          sum(payments.data as any[], "referrer_commission") +
          tipOverrides;
        const weeklyTotal = sum(weekly.data as any[], "amount");
        const totalEarnings = Math.max(
          earned,
          weeklyTotal + rentalCommissions + eventEarnings,
        );

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
          rentalCommissions,
          tipsEarned,
          tipOverrides,
          eventEarnings,
          eventCommissions,
          eventOverrides,

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
