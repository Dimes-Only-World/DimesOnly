import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MembershipAgreementSection from "@/components/MembershipAgreementSection";
import AngelLoader from "@/components/AngelLoader";

interface MembershipLimits {
  membership_type: string;
  user_type: string;
  current_count: number;
  max_count: number;
}

interface UserData {
  id: string;
  username: string;
  user_type: string;
  membership_tier: string;
  diamond_plus_active: boolean;
  phone_number?: string;
  email: string;
}

type Plan = "full" | "monthly";

const FULL_AMOUNT = 149.99;
const MONTHLY_AMOUNT = 80;

const UpgradeDiamondPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [membershipLimits, setMembershipLimits] = useState<MembershipLimits[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgradeInProgress, setUpgradeInProgress] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [plan, setPlan] = useState<Plan>("full");
  const [showRefundPolicy, setShowRefundPolicy] = useState(true);
  const [agreementComplete, setAgreementComplete] = useState(false);

  const AMOUNT = plan === "full" ? FULL_AMOUNT : MONTHLY_AMOUNT;

  // Calculate remaining spots (combine stripper and exotic limits)
  const diamondPlusLimits = membershipLimits.filter(
    (limit) => limit.membership_type === "diamond_plus"
  );

  const totalCurrentCount = diamondPlusLimits.reduce(
    (sum, limit) => sum + limit.current_count,
    0
  );

  // Overall cap of 300 shared between stripper and exotic
  const overallMaxCount = 300;
  const spotsLeft = overallMaxCount - totalCurrentCount;

  useEffect(() => {
    fetchUserData();
    fetchMembershipLimits();
  }, []);

  const fetchUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from("users")
        .select(
          "id, username, user_type, membership_tier, diamond_plus_active, phone_number, email"
        )
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setUserData(profile as UserData);
      setPhoneNumber((profile as UserData).phone_number || "");
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMembershipLimits = async () => {
    try {
      const { data, error } = await supabase
        .from("membership_limits")
        .select("*");

      if (error) throw error;
      setMembershipLimits(data as MembershipLimits[]);
    } catch (error) {
      console.error("Error fetching membership limits:", error);
    }
  };

  const initiatePayment = async (fundingSource?: string) => {
    if (!userData || !phoneNumber.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide your phone number",
        variant: "destructive",
      });
      return;
    }

    if (spotsLeft <= 0) {
      toast({
        title: "No Spots Available",
        description: "All Diamond Plus positions have been filled",
        variant: "destructive",
      });
      return;
    }

    setUpgradeInProgress(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        toast({
          title: "Authentication Required",
          description: "Please log in again to continue",
          variant: "destructive",
        });
        setUpgradeInProgress(false);
        return;
      }

      const paymentAmount = plan === "full" ? FULL_AMOUNT : MONTHLY_AMOUNT;
      const returnUrl = `${window.location.origin}/payment-return?payment=success`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled`;

      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "start-membership-paypal",
        {
          body: {
            tier: "diamond_plus",
            amount: paymentAmount,
            phone_number: phoneNumber,
            payment_method:
              plan === "full" ? "paypal_full" : "paypal_monthly",
            cadence: "one_time",
            billing_option: plan,
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        }
      );

      console.log("start-membership-paypal response:", { orderData, orderError });

      if (orderError) {
        throw new Error(orderError.message || "Failed to create PayPal order");
      }

      if (!orderData?.success) {
        throw new Error(orderData?.error || "PayPal order creation failed");
      }

      sessionStorage.setItem(
        "diamond_plus_upgrade",
        JSON.stringify({
          upgrade_id: orderData.upgrade_id,
          payment_option: plan,
          amount: paymentAmount,
        })
      );

      toast({
        title: "Redirecting to PayPal",
        description: "Please complete your payment...",
      });

      // Append funding source if specified
      let approvalUrl = orderData.approval_url;
      if (fundingSource) {
        approvalUrl += `&fundingSource=${fundingSource}`;
      }

      window.location.href = approvalUrl;
    } catch (error: any) {
      console.error("Error processing upgrade:", error);
      toast({
        title: "Upgrade Failed",
        description:
          error.message ||
          "There was an error processing your upgrade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpgradeInProgress(false);
    }
  };

  const handlePayPal = () => initiatePayment();
  const handlePayLater = () => initiatePayment("paylater");
  const handleCardRedirect = () => initiatePayment("card");

  if (loading) {
    return <AngelLoader variant="fullscreen" />;
  }

  const alreadyDiamondPlus = userData?.diamond_plus_active;

  return (
    <AppLayout>
      <Dialog open={showRefundPolicy} onOpenChange={setShowRefundPolicy}>
        <DialogContent className="bg-gray-900 border-fuchsia-500 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-fuchsia-400">
              Diamond Plus Membership Agreement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-white">
            <p>
              After you pay, you can only be refunded if you do not notarize your
              agreement within 30 days.
            </p>
            <p>
              We will keep the prorated amount of days you use the membership
              divided by 365 days, or 30 days from your monthly payment.
            </p>
            <p className="font-semibold text-yellow-300">
              If the agreement is signed and notarized, the membership fee is
              non-refundable.
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
            <div className="flex items-center justify-center gap-3 mb-2">
              <Crown className="w-10 h-10 text-yellow-400" />
              <h1 className="text-4xl font-bold text-white">Diamond Plus Membership</h1>
              <Crown className="w-10 h-10 text-yellow-400" />
            </div>
            <p className="text-fuchsia-200 mt-2 mb-4">
              Get Profit Sharing Position of up to $1,200,000 a year minimum for life in tier 2 — limited to 300 lifetime seats.
            </p>
            {alreadyDiamondPlus ? (
              <Badge className="text-lg px-4 py-2 bg-green-600">
                <CheckCircle className="w-4 h-4 mr-2" /> You're already Diamond Plus
              </Badge>
            ) : spotsLeft > 0 ? (
              <Badge variant="destructive" className="text-lg px-4 py-2">
                Only {spotsLeft} spots remaining!
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-lg px-4 py-2">
                All 300 Diamond Plus positions have been filled.
              </Badge>
            )}
          </div>

          {alreadyDiamondPlus ? (
            <Card className="bg-green-900/20 border-green-500 text-white">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-green-400 font-bold text-2xl mb-2">
                  You're Already Diamond Plus!
                </h2>
                <p className="text-green-300">
                  You have access to the $1,200,000/year profit sharing program in tier 2.
                </p>
              </CardContent>
            </Card>
          ) : spotsLeft <= 0 ? (
            <Card className="bg-red-900/20 border-red-500 text-white">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-red-400 font-bold text-2xl mb-2">
                  All Spots Taken
                </h2>
                <p className="text-red-300">
                  All 300 Diamond Plus positions have been filled.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <MembershipAgreementSection
                tier="diamond_plus"
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
                      <span>Profit share up to $125,000 a year max in tier 1</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Profit share $1,170,000 a year minimum in tier 2</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Quarterly pay of up to $31,250 max</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Priority placement in rankings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Access to exclusive events</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Direct support channel to CEO</span>
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
                      12 monthly payments = $960 total. <span className="text-fuchsia-300 font-semibold">Full access starts immediately</span> after the first payment.
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
                        disabled={upgradeInProgress}
                        className="bg-white/10 border-fuchsia-500/50 text-white placeholder:text-gray-400"
                        required
                      />
                      <p className="text-xs text-gray-400">Required for payment verification</p>
                    </div>

                    {agreementComplete ? (
                      <PaymentMethodSelector
                        amount={AMOUNT}
                        onPayPal={handlePayPal}
                        onPayLater={handlePayLater}
                        onCardRedirect={handleCardRedirect}
                        cardMode="redirect"
                        isProcessing={upgradeInProgress}
                        disabled={!phoneNumber}
                        paypalLabel={plan === "full" ? `Pay $${FULL_AMOUNT} Lifetime` : "Start 12-Month Plan"}
                      />
                    ) : (
                      <div className="rounded-lg border border-yellow-500 bg-yellow-500/10 p-4 text-sm text-yellow-200 text-center font-semibold">
                        Complete Diamond Plus Membership Agreement above to continue...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default UpgradeDiamondPage;
