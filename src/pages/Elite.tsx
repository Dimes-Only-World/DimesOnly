import React from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import AuthGuard from "@/components/AuthGuard";
import { useSearchParams } from "react-router-dom";

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
  const [searchParams] = useSearchParams();
  const selectedCadence = (searchParams.get("cadence") || "monthly").toLowerCase();
  const { data: stats, isLoading, isError, refetch } = useQuery<SeatStats, Error>({
    queryKey: ["elite-seat-stats"],
    queryFn: fetchSeatStats,
    refetchInterval: 15000,
  });

  const seatsAvailable = stats?.seats_available ?? 0;
  const full = seatsAvailable <= 0;
  const [loadingMonthly, setLoadingMonthly] = React.useState(false);
  const [loadingLifetime, setLoadingLifetime] = React.useState(false);
  const monthlyRef = React.useRef<HTMLDivElement | null>(null);
  const yearlyRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const target = selectedCadence === "yearly" ? yearlyRef.current : monthlyRef.current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedCadence]);

  const resolveUserId = async (): Promise<string | null> => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error("auth error", error);
      toast({ title: "Auth error", description: error.message, variant: "destructive" });
      return null;
    }
    return user?.id ?? null;
  };

  const handleStartMonthly = async () => {
    if (full) return;
    setLoadingMonthly(true);
    try {
      const userId = await resolveUserId();
      if (!userId) return;
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
      toast({ title: "Redirecting to PayPal", description: "Approve your Elite subscription" });
      window.location.href = data.approval_url as string;
    } catch (e: any) {
      console.error("Elite monthly start error", e);
      toast({ title: "Subscription error", description: e?.message || "Failed to start subscription", variant: "destructive" });
    } finally {
      setLoadingMonthly(false);
    }
  };

  const handleBuyLifetime = async () => {
    if (full) return;
    setLoadingLifetime(true);
    try {
      const userId = await resolveUserId();
      if (!userId) return;
      const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=elite&cadence=yearly`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=elite&cadence=yearly`;
      const { data, error } = await supabase.functions.invoke("create-paypal-order", {
        body: {
          payment_type: "elite_yearly",
          user_id: userId,
          amount: 10000.0,
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
    } catch (e: any) {
      console.error("Elite lifetime order error", e);
      toast({ title: "Checkout error", description: e?.message || "Failed to start checkout", variant: "destructive" });
    } finally {
      setLoadingLifetime(false);
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
              <CardTitle className="text-pink-400">Choose Your Plan</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCadence === 'yearly' ? (
                <div ref={yearlyRef} className="p-4 border rounded-lg border-pink-400 ring-1 ring-pink-500/50">
                  <div className="text-2xl font-bold">Lifetime (One-Time)</div>
                  <div className="text-gray-300 mb-2">Pay once → lifetime seat immediately</div>
                  <div className="text-3xl font-bold text-yellow-300 mb-4">$10,000</div>
                  <Button disabled={full || loadingLifetime} className="w-full bg-gradient-to-r from-pink-500 to-purple-600" onClick={handleBuyLifetime}>
                    {loadingLifetime ? "Processing..." : "Buy Lifetime"}
                  </Button>
                  {full && <p className="text-sm text-red-400 mt-2">Elite is currently full.</p>}
                </div>
              ) : (
                <div ref={monthlyRef} className="p-4 border rounded-lg border-pink-400 ring-1 ring-pink-500/50">
                  <div className="text-2xl font-bold">Monthly Path</div>
                  <div className="text-gray-300 mb-2">12 monthly payments → lifetime seat</div>
                  <div className="text-3xl font-bold text-yellow-300 mb-4">$846.33/mo</div>
                  <Button disabled={full || loadingMonthly} className="w-full bg-gradient-to-r from-pink-500 to-purple-600" onClick={handleStartMonthly}>
                    {loadingMonthly ? "Processing..." : "Start Monthly Subscription"}
                  </Button>
                  {full && <p className="text-sm text-red-400 mt-2">Elite is currently full.</p>}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4">Seats become permanent once lifetime is earned. 50 seat cap enforced.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};
 
// Provide React Query context (similar to Upgrade page pattern)
const queryClient = new QueryClient();

const ElitePage: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AuthGuard>
      <Elite />
    </AuthGuard>
  </QueryClientProvider>
);

export default ElitePage;
