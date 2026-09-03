import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MembershipAgreementSection from "@/components/MembershipAgreementSection";

interface MembershipUpdate {
  silver_plus_active: boolean;
  silver_plus_joined_at: string;
  membership_tier: string;
}

interface UpgradeSilverPlusProps {
  userId?: string;
  onMembershipUpdate?: (update: MembershipUpdate) => void;
}

type Plan = "full" | "monthly";

const FULL_AMOUNT = 249.99;
const MONTHLY_AMOUNT = 62.5;

export default function UpgradeSilverPlus({ userId, onMembershipUpdate }: UpgradeSilverPlusProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userIdFromUrl = searchParams.get("user_id");
  const effectiveUserId = userId || userIdFromUrl;
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [plan, setPlan] = useState<Plan>("full");
  const [showRefundPolicy, setShowRefundPolicy] = useState(true);
  const [agreementComplete, setAgreementComplete] = useState(false);
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null);
  const { toast } = useToast();

  const AMOUNT = plan === "full" ? FULL_AMOUNT : MONTHLY_AMOUNT;

  useEffect(() => {
    const fetchAvailability = async () => {
      const { data, error } = await supabase.rpc("check_silver_plus_availability");
      if (!error && Array.isArray(data) && data.length > 0) {
        const row = data[0];
        const remaining =
          typeof row.remaining === "number"
            ? row.remaining
            : (row.max_count ?? 300) - (row.current_count ?? 0);
        setSpotsLeft(Math.max(0, remaining));
      }
    };
    fetchAvailability();
  }, []);

  const resolveUserId = async (): Promise<string | null> => {
    if (effectiveUserId) return effectiveUserId;
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      toast({ title: "Auth Error", description: error.message, variant: "destructive" });
      return null;
    }
    if (!user?.id) {
      toast({ title: "Error", description: "User ID is missing", variant: "destructive" });
      return null;
    }
    return user.id;
  };

  const checkAvailability = async (): Promise<boolean> => {
    const { data: availability, error } = await supabase.rpc("check_silver_plus_availability");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }
    if (!availability || !availability[0]?.available) {
      toast({ title: "Not Available", description: "No more lifetime Silver+ memberships available.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const startPayment = async (fundingSource: "paypal" | "paylater" | "card") => {
    if (!phoneNumber) {
      toast({ title: "Missing Information", description: "Please provide your phone number", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (fundingSource === "card" && !(await checkAvailability())) {
        setLoading(false);
        return;
      }

      const returnUrl = `${window.location.origin}/payment-return?payment=success`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled`;

      const paymentMethod =
        plan === "monthly"
          ? "paypal_monthly"
          : fundingSource === "paylater"
          ? "paypal_paylater"
          : fundingSource === "card"
          ? "paypal_card"
          : "paypal_full";

      const { data, error } = await supabase.functions.invoke("start-membership-paypal", {
        body: {
          tier: "silver_plus",
          amount: AMOUNT,
          phone_number: phoneNumber,
          payment_method: paymentMethod,
          check_availability: true,
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      });

      if (error) throw error;
      if (!data?.success) {
        if (data?.code === "SOLD_OUT") {
          toast({ title: "Not Available", description: "No more lifetime Silver+ memberships available.", variant: "destructive" });
          return;
        }
        throw new Error(data?.error || "Failed to start payment");
      }

      toast({ title: "Redirecting to PayPal", description: "Please complete your payment..." });
      sessionStorage.setItem(
        "membership_upgrade",
        JSON.stringify({
          upgrade_id: data.upgrade_id,
          tier: "silver_plus",
          payment_option: plan,
          amount: AMOUNT,
        })
      );
      const suffix = fundingSource === "paylater" ? "&fundingSource=paylater" : fundingSource === "card" ? "&fundingSource=card" : "";
      window.location.href = data.approval_url + suffix;
    } catch (error: any) {
      console.error("Upgrade error:", error);
      toast({ title: "Upgrade Failed", description: error.message || "Failed to process upgrade", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <Dialog open={showRefundPolicy} onOpenChange={setShowRefundPolicy}>
        <DialogContent className="bg-gray-900 border-fuchsia-500 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-fuchsia-400">Silver Plus Membership Agreement</DialogTitle>
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
              onClick={() => setShowRefundPolicy(false)}
              className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
            >
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-fuchsia-900 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button
            variant="ghost"
            className="text-white hover:text-fuchsia-300 hover:bg-white/10"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <div className="text-center mt-2">
            <h1 className="text-4xl font-bold text-white">Silver Plus Membership</h1>
            <p className="text-fuchsia-200 mt-2 mb-4">
              General Member Profit-Sharing position — limited to 300 lifetime seats.
            </p>
            {spotsLeft !== null && spotsLeft > 0 ? (
              <Badge variant="destructive" className="text-lg px-4 py-2">
                Only {spotsLeft} spots remaining!
              </Badge>
            ) : spotsLeft === 0 ? (
              <Badge variant="destructive" className="text-lg px-4 py-2">
                All 300 Silver Plus positions have been filled.
              </Badge>
            ) : null}
          </div>

          <MembershipAgreementSection
            tier="silver_plus"
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
                  <span>Profit share up to $75,000 a year max in tier 1</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Profit share $1,170,000 a year minimum in tier 2</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Lifetime access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Exclusive content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Priority support</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Member-only events</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              onClick={() => setPlan("full")}
              className={`cursor-pointer bg-black/70 text-white transition-all ${plan === "full" ? "border-fuchsia-400 ring-2 ring-fuchsia-500" : "border-fuchsia-500/40"}`}
            >
              <CardHeader>
                <CardTitle className="text-fuchsia-400">One-Time Lifetime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-yellow-300">${FULL_AMOUNT}</div>
                <p className="text-sm text-gray-300 mt-2">Pay once → lifetime access immediately.</p>
              </CardContent>
            </Card>

            <Card
              onClick={() => setPlan("monthly")}
              className={`cursor-pointer bg-black/70 text-white transition-all ${plan === "monthly" ? "border-fuchsia-400 ring-2 ring-fuchsia-500" : "border-fuchsia-500/40"}`}
            >
              <CardHeader>
                <CardTitle className="text-fuchsia-400">12-Month Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-yellow-300">
                  ${MONTHLY_AMOUNT.toFixed(2)}<span className="text-xl">/mo</span>
                </div>
                <p className="text-sm text-gray-300 mt-2">
                  12 monthly payments = $750 total. <span className="text-fuchsia-300 font-semibold">Full access starts immediately</span> after the first payment.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-black/70 border-fuchsia-500 text-white">
            <CardHeader>
              <CardTitle className="text-fuchsia-400">
                Checkout — {plan === "full" ? `Lifetime $${FULL_AMOUNT}` : `First Payment $${MONTHLY_AMOUNT.toFixed(2)}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                    onCardRedirect={() => startPayment("card")}
                    cardMode="redirect"
                    isProcessing={loading}
                    disabled={!phoneNumber}
                    paypalLabel={plan === "full" ? `Pay $${FULL_AMOUNT} Lifetime` : "Start 12-Month Plan"}
                  />
                ) : (
                  <div className="rounded-lg border border-yellow-500 bg-yellow-500/10 p-4 text-sm text-yellow-200 text-center font-semibold">
                    Complete Silver Plus Membership Agreement above to continue...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
