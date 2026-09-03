import React, { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import AuthGuard from "@/components/AuthGuard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import MembershipAgreementSection from "@/components/MembershipAgreementSection";

interface SeatStats {
  seats_max: number;
  seats_taken: number;
  seats_available: number;
}

const fetchSeatStats = async (): Promise<SeatStats> => {
  const { data, error } = await supabase
    .from("business_owner_elite_seat_stats")
    .select("seats_max, seats_taken, seats_available")
    .single();
  if (error) throw error;
  return data as SeatStats;
};

type Plan = "lifetime" | "installment";

const PLAN_AMOUNTS: Record<Plan, number> = {
  lifetime: 15000,
  installment: 1500, // first installment ($1,250 + $250 fee)
};

const BusinessOwnerElite: React.FC = () => {
  const { toast } = useToast();
  const { data: stats, isLoading, refetch } = useQuery<SeatStats, Error>({
    queryKey: ["bo-elite-seat-stats"],
    queryFn: fetchSeatStats,
    refetchInterval: 15000,
  });

  const seatsAvailable = stats?.seats_available ?? 0;
  const full = seatsAvailable <= 0;
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [plan, setPlan] = useState<Plan>("lifetime");
  const [showAgreement, setShowAgreement] = useState(false);
  const [agreementComplete, setAgreementComplete] = useState(false);

  useEffect(() => {
    setShowAgreement(true);
  }, []);

  const AMOUNT = PLAN_AMOUNTS[plan];
  const tier = plan === "lifetime" ? "business_owner_elite" : "business_owner_elite_installment";

  const resolveUserId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
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
      if (!userId) {
        toast({ title: "Auth error", description: "Please sign in again", variant: "destructive" });
        return;
      }
      const returnUrl = `${window.location.origin}/payment-return?payment=success&tier=${tier}`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled&tier=${tier}`;

      const { data, error } = await supabase.functions.invoke("start-membership-paypal", {
        body: {
          user_id: userId,
          tier,
          amount: AMOUNT,
          phone_number: phoneNumber,
          payment_method: fundingSource === "card" ? "paypal_card" : (fundingSource === "paylater" ? "paypal_paylater" : "paypal_full"),
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      });
      if (error) throw error;
      if (!data?.success || !data?.approval_url) throw new Error(data?.error || "Failed to start payment");

      sessionStorage.setItem("membership_upgrade", JSON.stringify({
        upgrade_id: data.upgrade_id,
        tier,
      }));

      const suffix = fundingSource === "paylater" ? "&fundingSource=paylater" : (fundingSource === "card" ? "&fundingSource=card" : "");
      window.location.href = data.approval_url + suffix;
    } catch (e: any) {
      toast({ title: "Payment error", description: e?.message || "Failed to process payment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <Dialog open={showAgreement} onOpenChange={setShowAgreement}>
        <DialogContent className="bg-gray-900 border-fuchsia-500 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-fuchsia-400">Elite Plus Membership Agreement</DialogTitle>
            <DialogDescription className="text-gray-300">
              Please read the following terms before proceeding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-white">
            <p>
              After you pay, you can only be refunded if you do not notarize your agreement within 30 days.
            </p>
            <p>
              We will keep the prorated amount of days you use the membership divided by 365 days, or 30 days from your monthly payment.
            </p>
            <p className="font-semibold text-yellow-300">
              If the agreement is signed and notarized, the membership fee is non-refundable.
            </p>
            <Button
              onClick={() => setShowAgreement(false)}
              className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
            >
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-fuchsia-900 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center mt-4">
            <h1 className="text-4xl font-bold text-white">Elite Plus Membership</h1>
            <p className="text-fuchsia-200 mt-2">
              Business Owner Profit-Sharer position — limited to 100 lifetime seats with full site access.
            </p>
          </div>

          <MembershipAgreementSection
            tier="elite_plus"
            onSubmitted={() => setAgreementComplete(true)}
          />

          <Card className="bg-black/70 border-fuchsia-500 text-white">
            <CardHeader>
              <CardTitle className="text-fuchsia-400">Membership Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Profit share up to $200,000 a year max in tier 1</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Profit share $1,170,000 a year minimum in tier 2</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Lifetime full site access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Priority business owner support</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-black/70 border-fuchsia-500 text-white">
            <CardHeader>
              <CardTitle className="text-fuchsia-400">Seat Availability</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-gray-300">Loading…</div>
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
              ) : (
                <button className="underline text-red-400" onClick={() => refetch()}>Retry</button>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              onClick={() => setPlan("lifetime")}
              className={`cursor-pointer bg-black/70 text-white transition-all ${plan === "lifetime" ? "border-fuchsia-400 ring-2 ring-fuchsia-500" : "border-fuchsia-500/40"}`}
            >
              <CardHeader>
                <CardTitle className="text-fuchsia-400">One-Time Lifetime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-yellow-300">$15,000</div>
                <p className="text-sm text-gray-300 mt-2">Pay once → lifetime full access immediately.</p>
              </CardContent>
            </Card>

            <Card
              onClick={() => setPlan("installment")}
              className={`cursor-pointer bg-black/70 text-white transition-all ${plan === "installment" ? "border-fuchsia-400 ring-2 ring-fuchsia-500" : "border-fuchsia-500/40"}`}
            >
              <CardHeader>
                <CardTitle className="text-fuchsia-400">12-Month Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-yellow-300">$1,500 today</div>
                <p className="text-sm text-gray-300 mt-2">
                  $1,500 first payment (includes $250 processing fee), then $1,250/mo × 11.
                  Total $15,250. <span className="text-fuchsia-300 font-semibold">Full access starts immediately</span> after the first payment.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-black/70 border-fuchsia-500 text-white">
            <CardHeader>
              <CardTitle className="text-fuchsia-400">
                Checkout — {plan === "lifetime" ? "Lifetime $15,000" : "First Payment $1,500"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {full ? (
                <p className="text-red-400 text-center">All 100 Business Owner Elite seats are taken.</p>
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
                      className="bg-white/10 border-fuchsia-500/50 text-white placeholder:text-gray-400"
                      required
                    />
                    <p className="text-xs text-gray-400">Required for payment verification</p>
                  </div>

                  {agreementComplete ? (
                  <PaymentMethodSelector
                    amount={AMOUNT}
                    onPayPal={() => startPayment("paypal")}
                    onPayLater={() => startPayment("paylater")}
                    cardMode="redirect"
                    onCardRedirect={() => startPayment("card")}
                    isProcessing={loading}
                    disabled={!phoneNumber}
                    paypalLabel={plan === "lifetime" ? "Pay $15,000 Lifetime" : "Start 12-Month Plan"}
                  />
                  ) : (
                    <div className="rounded-lg border border-yellow-500 bg-yellow-500/10 p-4 text-sm text-yellow-200 text-center font-semibold">
                      Complete Elite Plus Membership Agreement above to continue...
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

const queryClient = new QueryClient();

const BusinessOwnerElitePage: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AuthGuard>
      <BusinessOwnerElite />
    </AuthGuard>
  </QueryClientProvider>
);

export default BusinessOwnerElitePage;
