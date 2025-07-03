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

const DiamondPlusAgreement = () => {
  return (
    <ScrollArea className="h-96 w-full rounded-md border p-4">
      <div className="space-y-4 text-sm">
        <div className="text-center">
          <h2 className="text-lg font-bold">HOUSING ANGELS, LLC</h2>
          <h3 className="text-md font-semibold">
            STRIPPER & EXOTIC FEMALE PARTICIPATION AGREEMENT
          </h3>
          <p className="text-sm text-gray-600">
            Annual Compensation Guarantee Program – Diamond Plus Membership
          </p>
        </div>

        <p>
          This Agreement ("Agreement") is entered into by and between Housing
          Angels, LLC ("Company") and the undersigned participant
          ("Participant"), effective as of the date of signing.
        </p>

        <div>
          <h4 className="font-semibold">1. Program Overview</h4>
          <p>
            Housing Angels, LLC offers a guaranteed $25,000 annual compensation
            to the first 300 approved Strippers and Exotic Females who meet all
            program requirements. Payments are issued quarterly in the amount of
            $6,250.00.
          </p>
          <p>
            The guarantee begins once the platform DimesOnly.World has reached a
            verified user base of:
          </p>
          <ul className="list-disc list-inside ml-4">
            <li>1,000 Female Stripper/Exotic profiles, and</li>
            <li>3,000 Male or Female "Normal" profiles.</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold">2. Membership Fee</h4>
          <p>
            To activate participation in this program, the Participant must
            enroll in Diamond Plus Membership.
          </p>
          <p>
            <strong>Diamond Plus Membership Fee: $349.00</strong> (includes
            online notary fee)
          </p>
          <p>This is a one-time, non-refundable fee.</p>
          <p>
            Payment confirms commitment to the program and eligibility for
            quarterly payments upon meeting all requirements.
          </p>
        </div>

        <div>
          <h4 className="font-semibold">
            3. Participant Requirements (Per Quarter)
          </h4>
          <p>
            To qualify for the $6,250 quarterly payout, Participant must
            complete the following every quarter:
          </p>

          <div className="ml-4 space-y-2">
            <div>
              <strong>3.1 Weekly Referrals</strong>
              <ul className="list-disc list-inside ml-4">
                <li>
                  Minimum 7 new verified referrals per week (84 per quarter)
                </li>
                <li>Deduction: $28.27 per missing referral per week</li>
              </ul>
            </div>

            <div>
              <strong>3.2 Weekly Content Uploads</strong>
              <ul className="list-disc list-inside ml-4">
                <li>Minimum 7 new photos/videos per week (168 items total)</li>
                <li>Deduction: $14.14 per missing photo or video</li>
              </ul>
            </div>

            <div>
              <strong>3.3 Event Participation</strong>
              <ul className="list-disc list-inside ml-4">
                <li>1 event per month (3 total per quarter)</li>
                <li>Deduction: $500 per missed event</li>
              </ul>
            </div>

            <div>
              <strong>3.4 New User Engagement</strong>
              <ul className="list-disc list-inside ml-4">
                <li>
                  Send 7 weekly messages to new users not referred by you (84
                  total per quarter)
                </li>
                <li>Deduction: $28.27 per missing message per week</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold">4. Compensation Terms</h4>
          <p>
            If all quarterly requirements are met, Participant will receive:
          </p>
          <ul className="list-disc list-inside ml-4">
            <li>$6,250.00 every 3 months</li>
            <li>$25,000.00 total annually</li>
          </ul>
          <p>
            Proportional Deductions apply for any missed items based on the
            rates above. Deductions will be subtracted from the quarter's
            payout.
          </p>
        </div>

        <div>
          <h4 className="font-semibold">5. Diamond Membership Plus Clause</h4>
          <p>
            If Participant earns $12,000 or more in platform income during any
            quarter (e.g., tips, referrals, merchandise, or other features), the
            $6,250 guarantee becomes void permanently.
          </p>
          <p>
            From that point, all income will be based solely on earned platform
            revenue.
          </p>
        </div>

        <div>
          <h4 className="font-semibold">6. Terms & Termination</h4>
          <p>This agreement remains in effect as long as:</p>
          <ul className="list-disc list-inside ml-4">
            <li>
              Participant is one of the first 300 approved Stripper/Exotic
              members
            </li>
            <li>Participant complies with all Section 3 requirements</li>
            <li>
              Participant remains active and in good standing on DimesOnly.World
            </li>
          </ul>
          <p>
            Failure to meet obligations or community standards may result in
            termination from the program.
          </p>
        </div>

        <div>
          <h4 className="font-semibold">7. Notarization & Activation</h4>
          <p>
            This agreement must be signed and notarized digitally. A licensed
            online notary will verify your identity and provide you with a copy
            for your records.
          </p>
          <p>
            Once notarized and the $349 payment is received, your Diamond Plus
            Membership will be active.
          </p>
        </div>

        <div>
          <h4 className="font-semibold">8. Signature & Acknowledgment</h4>
          <p>
            By signing below, you agree to the terms and confirm your enrollment
            in the Diamond Plus Membership tier.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
};

const UpgradePage: React.FC = () => {
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [membershipLimits, setMembershipLimits] = useState<MembershipLimits[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [upgradeInProgress, setUpgradeInProgress] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentOption, setPaymentOption] = useState<"full" | "installment">(
    "full"
  );
  const [showAgreement, setShowAgreement] = useState(false);

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
      // @ts-expect-error casting result
      setMembershipLimits(data as MembershipLimits[]);
    } catch (error) {
      console.error("Error fetching membership limits:", error);
    }
  };

  const handleUpgrade = async () => {
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
      // Create membership upgrade record
      const upgradeData = {
        user_id: userData.id,
        upgrade_type: "diamond_plus",
        payment_amount: paymentOption === "full" ? 349.0 : 111.73,
        payment_method:
          paymentOption === "full" ? "paypal_full" : "paypal_installment",
        installment_plan: paymentOption === "installment",
        installment_count: paymentOption === "installment" ? 2 : 1,
        phone_number: phoneNumber,
        user_type: userData.user_type,
        payment_status: "pending",
        upgrade_status: "pending",
      };

      const { data: upgrade, error: upgradeError } = await supabase
        .from("membership_upgrades")
        .insert(upgradeData)
        .select()
        .single();

      if (upgradeError) throw upgradeError;

      // Update user phone number
      await supabase
        .from("users")
        .update({ phone_number: phoneNumber })
        .eq("id", userData.id);

      // Create PayPal order
      const paymentAmount = paymentOption === "full" ? 349.0 : 111.73;
      const returnUrl = `${window.location.origin}/payment-return?payment=success&upgrade_id=${upgrade.id}`;
      const cancelUrl = `${window.location.origin}/payment-return?payment=cancelled`;

      // Use the existing create-paypal-order function with membership type
      const { data: orderData, error: orderError } =
        await supabase.functions.invoke("create-paypal-order", {
          body: {
            payment_type: "membership",
            membership_upgrade_id: upgrade.id,
            user_id: userData.id,
            amount: paymentAmount,
            installment_number: 1,
            return_url: returnUrl,
            cancel_url: cancelUrl,
            description:
              paymentOption === "full"
                ? "Diamond Plus Membership - Full Payment ($349)"
                : "Diamond Plus Membership - Installment 1/2 ($111.73)",
          },
        });

      console.log({ orderData, orderError });

      if (orderError) {
        throw new Error(orderError.message || "Failed to create PayPal order");
      }

      if (!orderData?.success) {
        throw new Error(orderData?.error || "PayPal order creation failed");
      }

      // Redirect to PayPal
      toast({
        title: "Redirecting to PayPal",
        description: "Please complete your payment...",
      });

      // Store upgrade info in sessionStorage for return handling
      sessionStorage.setItem(
        "diamond_plus_upgrade",
        JSON.stringify({
          upgrade_id: upgrade.id,
          payment_option: paymentOption,
          amount: paymentAmount,
        })
      );

      // Redirect to PayPal
      window.location.href = orderData.approval_url;
    } catch (error) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
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
              Join the elite $25,000/year guarantee program
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
                    <li>• $25,000 annual guarantee</li>
                    <li>• $6,250 quarterly payments</li>
                    <li>• Priority placement in rankings</li>
                    <li>• Access to exclusive events</li>
                    <li>• Direct support channel</li>
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
                  You have access to the $25,000 annual guarantee program.
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
                    <CardTitle className="flex items-center gap-2 text-yellow-400">
                      <DollarSign className="w-6 h-6" />
                      Guaranteed Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-3xl font-bold text-white">
                        $25,000
                      </div>
                      <div className="text-yellow-300">per year guaranteed</div>
                      <div className="text-lg text-white">
                        $6,250 quarterly payments
                      </div>
                      <p className="text-gray-800 text-sm">
                        Guaranteed annual compensation when you meet quarterly
                        requirements
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-400">
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
                        Guaranteed quarterly payouts
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Access to exclusive events
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        Direct support channel
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
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Full Payment */}
                    <div
                      className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
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
                          $349.00
                        </div>
                        <p className="text-gray-300 text-sm">
                          One-time payment, immediate activation
                        </p>
                      </div>
                    </div>

                    {/* Installment Payment */}
                    <div
                      className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentOption === "installment"
                          ? "border-yellow-400 bg-yellow-400/10"
                          : "border-gray-600 hover:border-gray-500"
                      }`}
                      onClick={() => setPaymentOption("installment")}
                    >
                      <div className="text-center">
                        <Calendar className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                        <h3 className="text-xl font-bold text-white mb-2">
                          2 Installments
                        </h3>
                        <div className="text-lg font-bold text-yellow-400 mb-1">
                          $149.00
                        </div>
                        <div className="text-sm text-gray-400 mb-2">
                          2 installments include $11.73 installment fee
                        </div>
                        <div className="text-2xl font-bold text-yellow-400 mb-1">
                          $111.73
                        </div>
                        <div className="text-sm text-gray-400 mb-2">
                          × 2 payments
                        </div>
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

              {/* Agreement Section */}
              <Card className="bg-white/10 backdrop-blur border-white/20 mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <FileText className="w-5 h-5" />
                    Participation Agreement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    Review the full participation agreement before proceeding
                    with your upgrade.
                  </p>
                  <Dialog open={showAgreement} onOpenChange={setShowAgreement}>
                    <DialogTrigger asChild>
                      <Button variant="default" className="w-full">
                        View Agreement
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl bg-white text-black">
                      <DialogHeader>
                        <DialogTitle>
                          Diamond Plus Participation Agreement
                        </DialogTitle>
                      </DialogHeader>
                      <DiamondPlusAgreement />
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>

              {/* Upgrade Button */}
              <div className="text-center">
                <Button
                  onClick={handleUpgrade}
                  disabled={upgradeInProgress || !phoneNumber.trim()}
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-black font-bold text-lg px-12 py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  {upgradeInProgress ? (
                    "Processing..."
                  ) : (
                    <>
                      <Crown className="w-5 h-5 mr-2" />
                      {paymentOption === "full"
                        ? "Pay $349.00 - Upgrade Now"
                        : "Pay First Installment $111.73"}
                    </>
                  )}
                </Button>
                <p className="text-gray-400 text-sm mt-4">
                  After payment, you'll receive instructions for your
                  notarization video call
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};

export default UpgradePage;
