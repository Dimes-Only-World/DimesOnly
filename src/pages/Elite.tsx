import React, { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import AuthGuard from "@/components/AuthGuard";
import { useSearchParams, useNavigate } from "react-router-dom";
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

const Elite: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedCadence = (searchParams.get("cadence") || "monthly").toLowerCase();
  const { data: stats, isLoading, isError, refetch } = useQuery<SeatStats, Error>({
    queryKey: ["elite-seat-stats"],
    queryFn: fetchSeatStats,
    refetchInterval: 15000,
  });

  const seatsAvailable = stats?.seats_available ?? 0;
  const full = seatsAvailable <= 0;
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const monthlyRef = React.useRef<HTMLDivElement | null>(null);
  const yearlyRef = React.useRef<HTMLDivElement | null>(null);

  const AMOUNT = selectedCadence === "yearly" ? 10000.0 : 846.33;

  React.useEffect(() => {
    const target = selectedCadence === "yearly" ? yearlyRef.current : monthlyRef.current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedCadence]);

  const resolveUserId = async (): Promise<string | null> => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      toast({ title: "Auth error", description: error.message, variant: "destructive" });
      return null;
    }
    return user?.id ?? null;
  };

  const handlePayPal = async () => {
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

      if (selectedCadence === "yearly") {
        // One-time payment for lifetime
        const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=elite&cadence=yearly`;
        const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=elite&cadence=yearly`;

        const { data, error } = await supabase.functions.invoke("create-paypal-order", {
          body: {
            payment_type: "elite_yearly",
            user_id: userId,
            amount: AMOUNT,
            return_url: returnUrl,
            cancel_url: cancelUrl,
            description: "Elite Membership - Lifetime",
          },
        });

        if (error) throw error;
        if (!data?.success || !data?.approval_url) {
          throw new Error(data?.error || "Failed to create order");
        }

        toast({ title: "Redirecting to PayPal", description: "Approve your Elite lifetime purchase" });
        window.location.href = data.approval_url as string;
      } else {
        // Monthly subscription
        const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=elite&cadence=monthly`;
        const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=elite&cadence=monthly`;

        const { data, error } = await supabase.functions.invoke("create-paypal-subscription", {
          body: {
            user_id: userId,
            tier: "elite",
            cadence: "monthly",
            return_url: returnUrl,
            cancel_url: cancelUrl,
            description: "Elite Membership - Monthly Subscription",
          },
        });

        if (error) throw error;
        if (!data?.success || !data?.approval_url) {
          throw new Error(data?.error || "Failed to create subscription");
        }

        sessionStorage.removeItem("membership_upgrade");
        sessionStorage.setItem("membership_subscription", JSON.stringify({
          subscription_id: data.subscription_id,
          user_id: userId,
          tier: "elite",
          cadence: "monthly",
        }));

        toast({ title: "Redirecting to PayPal", description: "Approve your Elite subscription" });
        window.location.href = data.approval_url as string;
      }
    } catch (e: any) {
      console.error("Elite payment error", e);
      toast({ title: "Payment error", description: e?.message || "Failed to process payment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePayLater = async () => {
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

      if (selectedCadence === "yearly") {
        const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=elite&cadence=yearly`;
        const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=elite&cadence=yearly`;

        const { data, error } = await supabase.functions.invoke("create-paypal-order", {
          body: {
            payment_type: "elite_yearly",
            user_id: userId,
            amount: AMOUNT,
            return_url: returnUrl,
            cancel_url: cancelUrl,
            description: "Elite Membership - Lifetime",
          },
        });

        if (error) throw error;
        if (!data?.success || !data?.approval_url) {
          throw new Error(data?.error || "Failed to create order");
        }

        toast({ title: "Redirecting to PayPal", description: "Approve your Elite lifetime purchase" });
        const approvalUrl = data.approval_url + "&fundingSource=paylater";
        window.location.href = approvalUrl;
      } else {
        const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=elite&cadence=monthly`;
        const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=elite&cadence=monthly`;

        const { data, error } = await supabase.functions.invoke("create-paypal-subscription", {
          body: {
            user_id: userId,
            tier: "elite",
            cadence: "monthly",
            return_url: returnUrl,
            cancel_url: cancelUrl,
            description: "Elite Membership - Monthly Subscription",
          },
        });

        if (error) throw error;
        if (!data?.success || !data?.approval_url) {
          throw new Error(data?.error || "Failed to create subscription");
        }

        sessionStorage.removeItem("membership_upgrade");
        sessionStorage.setItem("membership_subscription", JSON.stringify({
          subscription_id: data.subscription_id,
          user_id: userId,
          tier: "elite",
          cadence: "monthly",
        }));

        toast({ title: "Redirecting to PayPal", description: "Approve your Elite subscription" });
        const approvalUrl = data.approval_url + "&fundingSource=paylater";
        window.location.href = approvalUrl;
      }
    } catch (e: any) {
      console.error("Elite payment error", e);
      toast({ title: "Payment error", description: e?.message || "Failed to process payment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCardRedirect = async () => {
    if (full) return;
    if (!phoneNumber) {
      toast({ title: "Missing Information", description: "Please provide your phone number", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const userId = await resolveUserId();
      if (!userId) return;

      const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=elite&cadence=${selectedCadence}`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=elite&cadence=${selectedCadence}`;

      const { data, error } = await supabase.functions.invoke("start-membership-paypal", {
        body: {
          user_id: userId,
          tier: "elite",
          amount: AMOUNT,
          cadence: selectedCadence,
          phone_number: phoneNumber,
          payment_method: "paypal_card",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      });

      if (error) throw error;
      if (!data?.success || !data?.approval_url) {
        throw new Error(data?.error || "Failed to create payment");
      }

      sessionStorage.setItem("membership_upgrade", JSON.stringify({
        upgrade_id: data.upgrade_id,
        tier: "elite",
        cadence: selectedCadence,
      }));

      toast({ title: "Redirecting to PayPal", description: "Complete card payment on PayPal..." });
      const approvalUrl = data.approval_url + "&fundingSource=card";
      window.location.href = approvalUrl;
    } catch (error: any) {
      console.error("Card redirect error:", error);
      toast({ title: "Payment Error", description: error.message || "Failed to start card payment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center mt-4">
            <h1 className="text-4xl font-bold text-white">Elite Membership</h1>
            <p className="text-pink-200 mt-2">Limited to 50 lifetime seats</p>
          </div>

          <Card className="bg-black/70 border-pink-500 text-white">
            <CardHeader>
              <CardTitle className="text-pink-400">Seat Availability</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-gray-300">Loading seat stats...</div>
              ) : isError ? (
                <div className="text-red-400">Failed to load seat stats. <button className="underline" onClick={() => refetch()}>Retry</button></div>
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
              <CardTitle className="text-pink-400">
                {selectedCadence === 'yearly' ? 'Lifetime (One-Time)' : 'Monthly Path'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={selectedCadence === 'yearly' ? yearlyRef : monthlyRef} className="space-y-6">
                <div className="text-center">
                  <div className="text-gray-300 mb-2">
                    {selectedCadence === 'yearly' 
                      ? 'Pay once → lifetime seat immediately' 
                      : '12 monthly payments → lifetime seat'}
                  </div>
                  <div className="text-4xl font-bold text-yellow-300 mb-4">
                    {selectedCadence === 'yearly' ? '$10,000' : '$846.33/mo'}
                  </div>
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
                      onPayPal={handlePayPal}
                      onPayLater={handlePayLater}
                      cardMode="redirect"
                      onCardRedirect={handleCardRedirect}
                      isProcessing={loading}
                      disabled={!phoneNumber}
                      paypalLabel={selectedCadence === 'yearly' ? 'Buy Lifetime' : 'Start Monthly Subscription'}
                    />
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-4 text-center">
                  Seats become permanent once lifetime is earned. 50 seat cap enforced.
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
