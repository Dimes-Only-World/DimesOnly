import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Star,
  Crown,
  DollarSign,
  Calendar,
  Users,
  FileText,
  CreditCard,
  Phone,
  AlertCircle,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import AuthGuard from "@/components/AuthGuard";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import AngelLoader from "@/components/AngelLoader";
import MembershipAgreementSection from "@/components/MembershipAgreementSection";

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


const UpgradeDiamondPage: React.FC = () => {
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [membershipLimits, setMembershipLimits] = useState<MembershipLimits[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [upgradeInProgress, setUpgradeInProgress] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentOption, setPaymentOption] = useState<
    "full" | "monthly"
  >("full");
  const [showAgreement, setShowAgreement] = useState(false);
  const [showRefundPolicy, setShowRefundPolicy] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [agreementComplete, setAgreementComplete] = useState(false);

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

      const paymentAmount = paymentOption === "full" ? 149.99 : 80;
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
              paymentOption === "full" ? "paypal_full" : "paypal_monthly",
            cadence: "one_time",
            billing_option: paymentOption,
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
          payment_option: paymentOption,
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

  const handleUpgradeClick = () => {
    if (!agreementComplete) {
      toast({
        title: "Agreement Required",
        description:
          "Complete Diamond Plus Membership Agreement above to continue...",
        variant: "destructive",
      });
      return;
    }
    if (!phoneNumber.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide your phone number",
        variant: "destructive",
      });
      return;
    }
    setShowPaymentDialog(true);
  };

  if (loading) {
    return <AngelLoader variant="fullscreen" />;
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-red-900/20 border-red-500">
          <CardContent className="p-8 text-center">
            <h2 className="text-red-400 font-bold text-xl mb-2">
              Access Denied
            </h2>
            <p className="text-red-300">
              Please log in to access the upgrade page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is eligible for Diamond Plus
  const isEligible =
    userData.user_type === "stripper" || userData.user_type === "exotic";
  const alreadyDiamondPlus = userData.diamond_plus_active;

  return (
    <AuthGuard>
      <Dialog open={showRefundPolicy} onOpenChange={setShowRefundPolicy}>
        <DialogContent className="max-w-lg bg-gray-900 border-yellow-500 text-white">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">
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
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
            >
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Crown className="w-12 h-12 text-yellow-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Diamond Plus Membership
              </h1>
              <Crown className="w-12 h-12 text-yellow-400" />
            </div>
            <p className="text-xl text-gray-300 mb-4">
              Get Profit Sharing Position of up to $1,200,000 a year minimum for life in tier 2.
            </p>
            {spotsLeft > 0 && isEligible && (
              <Badge variant="destructive" className="text-lg px-4 py-2">
                Only {spotsLeft} spots remaining!
              </Badge>
            )}
          </div>

          {!isEligible ? (
            <Card className="bg-blue-900/20 border-blue-500 mb-8">
              <CardContent className="p-8 text-center">
                <Crown className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h2 className="text-blue-400 font-bold text-2xl mb-2">
                  Diamond Plus Information
                </h2>
                <p className="text-blue-300 mb-4">
                  Diamond Plus membership is exclusively available for Stripper
                  and Exotic user types.
                </p>
                <div className="bg-blue-800/30 rounded-lg p-4 mb-4">
                  <h3 className="text-white font-semibold mb-2">
                    Program Benefits:
                  </h3>
                  <ul className="text-blue-200 text-sm space-y-1 text-left">
                    <li>• $150,000/year profit sharing</li>
                    <li>• Bi weekly pay of up to $5,769.23 max</li>
                    <li>• Priority placement in rankings</li>
                    <li>• Access to exclusive events</li>
                    <li>• Direct support channel to CEO</li>
                  </ul>
                </div>
                <p className="text-blue-300 text-sm">
                  If you're a Stripper or Exotic performer, please contact
                  support to update your account type.
                </p>
              </CardContent>
            </Card>
          ) : alreadyDiamondPlus ? (
            <Card className="bg-green-900/20 border-green-500 mb-8">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-green-400 font-bold text-2xl mb-2">
                  You're Already Diamond Plus!
                </h2>
                <p className="text-green-300">
                  You have access to the $200,000/year profit sharing program.
                </p>
              </CardContent>
            </Card>
          ) : spotsLeft <= 0 ? (
            <Card className="bg-red-900/20 border-red-500 mb-8">
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
            <div className="space-y-6">
              {/* Agreement + Identity Verification Section */}
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
                  onClick={() => setPaymentOption("full")}
                  className={`cursor-pointer bg-black/70 text-white transition-all ${paymentOption === "full" ? "border-fuchsia-400 ring-2 ring-fuchsia-500" : "border-fuchsia-500/40"}`}
                >
                  <CardHeader>
                    <CardTitle className="text-fuchsia-400">One-Time Lifetime</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-yellow-300">$149.99</div>
                    <p className="text-sm text-gray-300 mt-2">
                      One-time payment → immediate activation.
                    </p>
                  </CardContent>
                </Card>

                <Card
                  onClick={() => setPaymentOption("monthly")}
                  className={`cursor-pointer bg-black/70 text-white transition-all ${paymentOption === "monthly" ? "border-fuchsia-400 ring-2 ring-fuchsia-500" : "border-fuchsia-500/40"}`}
                >
                  <CardHeader>
                    <CardTitle className="text-fuchsia-400">12-Month Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-yellow-300">
                      $80.00<span className="text-xl">/mo</span>
                    </div>
                    <p className="text-sm text-gray-300 mt-2">
                      12 monthly payments = $960 total.{" "}
                      <span className="text-fuchsia-300 font-semibold">Full access starts immediately</span> after the first payment.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-black/70 border-fuchsia-500 text-white">
                <CardHeader>
                  <CardTitle className="text-fuchsia-400">
                    Checkout — {paymentOption === "full" ? "Lifetime $149.99" : "First Payment $80.00"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        disabled={upgradeInProgress}
                        className="bg-white/10 border-fuchsia-500/50 text-white placeholder:text-gray-400"
                        required
                      />
                      <p className="text-xs text-gray-400">Required for payment verification</p>
                    </div>

                    {agreementComplete ? (
                      <PaymentMethodSelector
                        amount={paymentOption === "full" ? 149.99 : 80}
                        onPayPal={handlePayPal}
                        onPayLater={handlePayLater}
                        onCardRedirect={handleCardRedirect}
                        cardMode="redirect"
                        isProcessing={upgradeInProgress}
                        disabled={!phoneNumber}
                        paypalLabel={
                          paymentOption === "full"
                            ? "Pay $149.99 - Upgrade Now"
                            : "Pay $80.00 - First Monthly Payment"
                        }
                      />
                    ) : (
                      <div className="rounded-lg border border-yellow-500 bg-yellow-500/10 p-4 text-sm text-yellow-200 text-center font-semibold">
                        Complete Diamond Plus Membership Agreement above to continue...
                      </div>
                    )}

                    <p className="text-gray-400 text-xs text-center">
                      After payment, you'll receive instructions for your notarization video call
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
    </AuthGuard>
  );
};

export default UpgradeDiamondPage;
