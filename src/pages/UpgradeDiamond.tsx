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
            <>
              {/* Benefits Section */}
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <Card className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-yellow-500/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-800">
                      <DollarSign className="w-6 h-6" />
                      Profit Sharing Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-3xl font-bold text-white">
                        $125,000
                      </div>
                      <div className="text-gray-600">a year max for life in tier 1</div>
                      <div className="text-lg text-gray-800">
                        Quarterly pay of up to $31,250 max
                      </div>
                      <p className="text-gray-800 text-sm">
                        Profit sharing compensation max is based on companies net
                        profits.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-800">
                      <Star className="w-6 h-6" />
                      Exclusive Benefits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-gray-600">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Priority placement in rankings
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Guaranteed bi weekly payouts
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Access to exclusive events
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Direct support channel to CEO
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Pricing Section */}
              <Card className="bg-white/10 backdrop-blur border-white/20 mb-8">
                <CardHeader>
                  <CardTitle className="text-2xl text-center text-white">
                    Choose Your Payment Option
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Payment */}
                    <div
                      className={`p-6 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-center ${
                        paymentOption === "full"
                          ? "border-yellow-400 bg-yellow-400/10"
                          : "border-gray-600 hover:border-gray-500"
                      }`}
                      onClick={() => setPaymentOption("full")}
                    >
                      <div className="text-center">
                        <CreditCard className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                        <h3 className="text-xl font-bold text-white mb-2">
                          Full Payment
                        </h3>
                        <div className="text-3xl font-bold text-yellow-400 mb-2">
                          $149.99
                        </div>
                        <p className="text-gray-300 text-sm">
                          One-time payment, immediate activation
                        </p>
                      </div>
                    </div>

                    {/* Monthly Plan */}
                    <div
                      className={`p-6 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-center ${
                        paymentOption === "monthly"
                          ? "border-yellow-400 bg-yellow-400/10"
                          : "border-gray-600 hover:border-gray-500"
                      }`}
                      onClick={() => setPaymentOption("monthly")}
                    >
                      <div className="text-center">
                        <Calendar className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                        <h3 className="text-xl font-bold text-white mb-2">
                          Monthly Plan
                        </h3>
                        <div className="text-3xl font-bold text-yellow-400 mb-1">
                          $80.00<span className="text-base">/mo</span>
                        </div>
                        <div className="text-sm text-gray-400 mb-2">
                          12 monthly payments = $960 total
                        </div>
                        <p className="text-gray-300 text-sm">
                          Immediate activation after first payment
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* Phone Number Input */}
              <Card className="bg-white/10 backdrop-blur border-white/20 mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Phone className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="phone" className="text-gray-300">
                        Phone Number (Required for PayPal)
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="bg-white/20 border-white/30 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Email</Label>
                      <Input
                        type="email"
                        value={userData.email}
                        disabled
                        className="bg-gray-800 border-gray-600 text-gray-400"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Agreement + Identity Verification Section */}
              <MembershipAgreementSection tier="diamond_plus" />


              {/* Upgrade Button */}
              <div className="text-center">
                <Button
                  onClick={handleUpgradeClick}
                  disabled={!phoneNumber.trim()}
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-bold text-lg px-12 py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  {paymentOption === "full"
                    ? "Pay $149.99 - Upgrade Now"
                    : "Pay $80.00 - First Monthly Payment"}
                </Button>
                <p className="text-gray-400 text-sm mt-4">
                  After payment, you'll receive instructions for your
                  notarization video call
                </p>

                {/* Payment Method Dialog */}
                <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                  <DialogContent className="max-w-md bg-gray-900 border-white/20">
                    <DialogHeader>
                      <DialogTitle className="text-white text-center text-xl">
                        Choose Payment Method
                      </DialogTitle>
                      <p className="text-gray-300 text-center text-sm pt-2">
                        {paymentOption === "full"
                          ? "Total: $149.99 (One-time Payment)"
                          : "First Monthly Payment: $80.00 (of 12 × $80 = $960)"}
                      </p>
                    </DialogHeader>
                    
                    <div className="py-4">
                      <PaymentMethodSelector
                        amount={
                          paymentOption === "full"
                            ? 149.99
                            : paymentOption === "monthly"
                            ? 80
                            : 49.99
                        }
                        onPayPal={handlePayPal}
                        onPayLater={handlePayLater}
                        onCardRedirect={handleCardRedirect}
                        cardMode="redirect"
                        isProcessing={upgradeInProgress}
                        disabled={false}
                      />
                    </div>
                    
                    <p className="text-gray-400 text-xs text-center">
                      Secure payment processed by PayPal
                    </p>
                  </DialogContent>
                </Dialog>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default UpgradeDiamondPage;
