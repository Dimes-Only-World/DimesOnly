import React, { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import AuthGuard from "@/components/AuthGuard";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";

interface SeatStats {
  seats_max: number;
  seats_taken: number;
  seats_available: number;
}

const fetchSeatStats = async (): Promise<SeatStats> => {
  const { data, error } = await supabase
    .from("elite_seat_stats")
    .select("seats_max, seats_taken, seats_available")
    .single();
  if (error) throw error;
  return data as SeatStats;
};

type Tier = "elite" | "elite_plus";
type Cadence = "monthly" | "yearly";

const Elite: React.FC = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const tier = ((searchParams.get("tier") || "elite").toLowerCase() === "elite_plus"
    ? "elite_plus"
    : "elite") as Tier;
  const cadence = ((searchParams.get("cadence") || "monthly").toLowerCase() === "yearly"
    ? "yearly"
    : "monthly") as Cadence;

  const { data: stats, isLoading, isError, refetch } = useQuery<SeatStats, Error>({
    queryKey: ["elite-seat-stats"],
    queryFn: fetchSeatStats,
    refetchInterval: 15000,
  });

  const seatsAvailable = stats?.seats_available ?? 0;
  const full = seatsAvailable <= 0;
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  // Pricing matrix
  const AMOUNT =
    tier === "elite"
      ? cadence === "yearly" ? 10000.0 : 861.75
      : cadence === "yearly" ? 15000.0 : 1500.0; // elite_plus monthly = first-payment ($1,250 + $250 setup)

  const titleText =
    tier === "elite_plus"
      ? cadence === "yearly" ? "Elite Plus — Lifetime" : "Elite Plus — 12-Month Plan"
      : cadence === "yearly" ? "Elite — Annual" : "Elite — Monthly";

  const subText =
    tier === "elite_plus" && cadence === "yearly"
      ? "One-time $15,000 payment → lifetime access immediately."
      : tier === "elite_plus" && cadence === "monthly"
        ? "$1,500 first payment (includes $250 setup fee), then $1,250/mo × 11. Full access starts immediately."
        : tier === "elite" && cadence === "yearly"
          ? "$10,000 billed annually. Recurring subscription."
          : "$861.75 billed every month. Recurring subscription.";

  const priceDisplay =
    tier === "elite_plus" && cadence === "yearly"
      ? "$15,000"
      : tier === "elite_plus" && cadence === "monthly"
        ? "$1,500 today"
        : tier === "elite" && cadence === "yearly"
          ? "$10,000/yr"
          : "$861.75/mo";

  const paypalLabel =
    tier === "elite_plus" && cadence === "yearly"
      ? "Buy Lifetime — $15,000"
      : tier === "elite_plus" && cadence === "monthly"
        ? "Start 12-Month Plan — $1,500 today"
        : tier === "elite" && cadence === "yearly"
          ? "Subscribe Annually — $10,000/yr"
          : "Subscribe Monthly — $861.75/mo";

  const resolveUserId = async (): Promise<string | null> => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      toast({ title: "Auth error", description: error.message, variant: "destructive" });
      return null;
    }
    return user?.id ?? null;
  };

  const startPayment = async (fundingSource: "paypal" | "paylater" | "card") => {
    if (full) return;
    if (!phoneNumber) {
      toast({ title: "Missing Information", description: "Please provide your phone number", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const userId = await resolveUserId();
      if (!userId) return;

      await supabase.from("users").update({ phone_number: phoneNumber }).eq("id", userId);

      const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=${tier}&cadence=${cadence}`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=${tier}&cadence=${cadence}`;

      // Path selection
      // - elite_plus + yearly: one-time PayPal order (create-paypal-order, elite_plus_lifetime)
      // - card funding on any path: start-membership-paypal (redirect)
      // - elite monthly/yearly + elite_plus monthly: PayPal subscription (create-paypal-subscription)
      if (fundingSource === "card") {
        const { data, error } = await supabase.functions.invoke("start-membership-paypal", {
          body: {
            user_id: userId,
            tier: tier === "elite_plus" && cadence === "monthly" ? "elite_plus_installment" : tier === "elite_plus" ? "elite_plus" : "elite",
            amount: AMOUNT,
            cadence,
            phone_number: phoneNumber,
            payment_method: "paypal_card",
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        });
        if (error) throw error;
        if (!data?.success || !data?.approval_url) throw new Error(data?.error || "Failed to create payment");
        sessionStorage.setItem("membership_upgrade", JSON.stringify({
          upgrade_id: data.upgrade_id, tier, cadence,
        }));
        window.location.href = data.approval_url + "&fundingSource=card";
        return;
      }

      if (tier === "elite_plus" && cadence === "yearly") {
        // One-time $15,000 order
        const { data, error } = await supabase.functions.invoke("create-paypal-order", {
          body: {
            payment_type: "elite_plus_lifetime",
            user_id: userId,
            amount: AMOUNT,
            return_url: returnUrl,
            cancel_url: cancelUrl,
            description: "Elite Plus - Lifetime ($15,000)",
          },
        });
        if (error) throw error;
        if (!data?.success || !data?.approval_url) throw new Error(data?.error || "Failed to create order");
        toast({ title: "Redirecting to PayPal", description: "Approve your Elite Plus lifetime purchase" });
        const suffix = fundingSource === "paylater" ? "&fundingSource=paylater" : "";
        window.location.href = (data.approval_url as string) + suffix;
        return;
      }

      // Recurring subscription path
      // elite monthly/yearly OR elite_plus monthly installment plan
      const subTier = tier === "elite_plus" ? "elite_plus_installment" : "elite";
      const subCadence = tier === "elite_plus" ? "monthly" : cadence;

      const { data, error } = await supabase.functions.invoke("create-paypal-subscription", {
        body: {
          user_id: userId,
          tier: subTier,
          cadence: subCadence,
          return_url: returnUrl,
          cancel_url: cancelUrl,
          description: titleText,
        },
      });
      if (error) throw error;
      if (!data?.success || !data?.approval_url) throw new Error(data?.error || "Failed to create subscription");

      sessionStorage.removeItem("membership_upgrade");
      sessionStorage.setItem("membership_subscription", JSON.stringify({
        subscription_id: data.subscription_id,
        user_id: userId,
        tier: subTier,
        cadence: subCadence,
      }));

      toast({ title: "Redirecting to PayPal", description: "Approve your subscription" });
      const suffix = fundingSource === "paylater" ? "&fundingSource=paylater" : "";
      window.location.href = (data.approval_url as string) + suffix;
    } catch (e: any) {
      console.error("Elite payment error", e);
      toast({ title: "Payment error", description: e?.message || "Failed to process payment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center mt-4">
            <h1 className="text-4xl font-bold text-white">
              {tier === "elite_plus" ? "Elite Plus Membership" : "Elite Membership"}
            </h1>
            <p className="text-pink-200 mt-2">Limited to 50 seats (combined Elite + Elite Plus)</p>
          </div>

          <Card className="bg-black/70 border-pink-500 text-white">
            <CardHeader>
              <CardTitle className="text-pink-400">Seat Availability</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-gray-300">Loading seat stats...</div>
              ) : isError ? (
                <div className="text-red-400">
                  Failed to load seat stats. <button className="underline" onClick={() => refetch()}>Retry</button>
                </div>
              ) : stats ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold">{stats.seats_taken} / {stats.seats_max}</div>
                    <div className="text-gray-300">Seats taken</div>
                  </div>
                  <div className={`text-xl font-semibold ${full ? "text-red-400" : "text-green-400"}`}>
                    {stats.seats_available} available
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="bg-black/70 border-pink-500 text-white">
            <CardHeader>
              <CardTitle className="text-pink-400">{titleText}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-gray-300 mb-2">{subText}</div>
                  <div className="text-4xl font-bold text-yellow-300 mb-4">{priceDisplay}</div>
                </div>

                {full ? (
                  <p className="text-sm text-red-400 text-center">Elite is currently full.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={loading}
                        className="bg-white/10 border-pink-500/50 text-white placeholder:text-gray-400"
                        required
                      />
                      <p className="text-xs text-gray-400">Required for payment verification</p>
                    </div>

                    <PaymentMethodSelector
                      amount={AMOUNT}
                      onPayPal={() => startPayment("paypal")}
                      onPayLater={() => startPayment("paylater")}
                      cardMode="redirect"
                      onCardRedirect={() => startPayment("card")}
                      isProcessing={loading}
                      disabled={!phoneNumber}
                      paypalLabel={paypalLabel}
                    />
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-4 text-center">
                  50-seat cap enforced across Elite + Elite Plus combined.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

const queryClient = new QueryClient();

const ElitePage: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AuthGuard>
      <Elite />
    </AuthGuard>
  </QueryClientProvider>
);

export default ElitePage;
