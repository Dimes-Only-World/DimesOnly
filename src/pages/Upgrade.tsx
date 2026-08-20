import React, { useMemo, useState } from "react";

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
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import AuthGuard from "@/components/AuthGuard";
import { CreditCard, Phone, Calendar, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import AngelLoader from "@/components/AngelLoader";

interface Package {
  id: string;
  name: string;
  price: number;
  subtitle?: string;
  monthly?: string;
  badge?: string;
  savings?: string;
  warning?: string;
  benefits: string[];
  installmentCount?: number;
  installmentAmount?: number;
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

const packages: Package[] = [
  {
    id: "silver",
    name: "SILVER PACKAGE",
    price: 49.99,
    badge: "POSITIONS LIMITED",
    savings: "SAVE 72%",
    warning: "PRICE GOING UP SOON!",
    benefits: [
      "20% override on all the free people that join under your link in phase 2.",
      "30% of all subscriptions/memberships sold through your link now.",
      "40% of tips designated to you through your link.",
      "20% of tips if designated to you through someone else's link.",
      "20% of tips if they choose you to tip.",
      "View nudes from strippers and exotics.",
      "Do not wait to get sponsored and pay for a profit-sharing position.",
    ],
  },
  {
    id: "gold",
    name: "GOLD PACKAGE",
    price: 99.99,
    benefits: [
      "All the benefits of the Silver Package.",
      "Lifetime FREE admission to all events surrounding the show and cast members forever.",
      "Lifetime subscription to the upcoming FLAME FLIX Social media webpage on ALL affiliated platform apps.",
      "Be 1 of 10 out of 300 chosen to be in the semi-finals every year, instead of competing against millions of dancers that join FREE.",
      "This increases your chances of going to the semi-finals every year in Los Angeles, CA.",
      "Get featured on our Instagram page along with cast members.",
    ],
  },
  {
    id: "diamond",
    name: "DIAMOND PACKAGE",
    price: 150.0,
    subtitle: "SPLIT PAYMENT IN 3",
    monthly: "$53.25 a month includes transaction fees",
    installmentCount: 3,
    installmentAmount: 53.25,
    benefits: [
      "GET ALL THE BENEFITS OF FREE, SILVER AND GOLD",
      "VIP Access & VIP Section 4 times a year + 1 person you can bring FREE.",
      
      "Get featured on our Instagram page along with cast members.",
      "Get featured on the opening page of the App every day for 3 years.",
    ],
  },
  {
    id: "elite",
    name: "ELITE PACKAGE",
    price: 10000.0,
    benefits: [
      "GET ALL THE BENEFITS OF FREE, SILVER AND GOLD",
      "VIP Access & VIP Section 4 times a year + 3 people you can bring FREE.",
      "Get 10% profit shared equally in the elite club",
      "Get exclusive VIP access to all Yacht and Mansion Parties globally.",
      "Come to season reunions free for updates and meet and greets to new celebrity host and cast members",
    ],
  },
  {
    id: "elite_plus",
    name: "ELITE PLUS PACKAGE",
    price: 15000.0,
    badge: "LIFETIME OR 12-MO PLAN",
    benefits: [
      "ALL Elite benefits — permanently.",
      "One-time $15,000 lifetime, or 12-month installment plan.",
      "12-Month Plan: $1,500 first payment ($1,250 + $250 setup), then $1,250/mo × 11.",
      "Full site access starts immediately after first payment.",
      "Priority VIP treatment at every event and reunion.",
    ],
  },
];


const fetchUserData = async (): Promise<UserData | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("users")
    .select(
      "id, username, user_type, membership_tier, diamond_plus_active, phone_number, email, is_business_owner"
    )
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return profile as UserData;
};

const TIER_RANK: Record<string, number> = {
  "": 0,
  free: 0,
  silver: 1,
  silver_plus: 2,
  gold: 3,
  diamond: 4,
  diamond_plus: 5,
  elite: 6,
  elite_plus: 7,
};
const rankOf = (t: string | null | undefined) => TIER_RANK[String(t || "").toLowerCase()] ?? 0;

const normalizeTier = (t: string | null | undefined) => {
  const s = String(t || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "silverplus") return "silver_plus";
  if (s === "diamondplus") return "diamond_plus";
  if (s === "eliteplus") return "elite_plus";
  return s;
};

const TIER_LABEL: Record<string, string> = {
  "": "Free",
  free: "Free",
  silver: "Silver",
  silver_plus: "Silver Plus",
  gold: "Gold",
  diamond: "Diamond",
  diamond_plus: "Diamond Plus",
  elite: "Elite",
  elite_plus: "Elite Plus",
};

interface SubscriptionRow {
  id: string;
  subscription_id: string;
  tier: string;
  cadence: string;
  status: string;
  next_billing_time: string | null;
  membership_expires_at: string | null;
}

const UpgradePageInner: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: userData, isLoading: userLoading, refetch: refetchUser } = useQuery<UserData | null, Error>({
    queryKey: ["user"],
    queryFn: fetchUserData,
  });

  const { data: subscription, refetch: refetchSubscription } = useQuery<SubscriptionRow | null>({
    queryKey: ["active-subscription", userData?.id],
    enabled: !!userData?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions" as any)
        .select("id, subscription_id, tier, cadence, status, next_billing_time, membership_expires_at")
        .eq("user_id", userData!.id)
        .in("status", ["active", "cancelled"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as SubscriptionRow) || null;
    },
  });

  // Audience gating: everyone sees the standard Silver/Gold/Diamond/Elite
  // packages (including their current one). Elite Plus is business owners only.
  const visiblePackages = useMemo(() => {
    const businessOwner =
      Boolean((userData as any)?.is_business_owner) ||
      ["business_owner", "businessowner"].includes(
        String(userData?.user_type || "").trim().toLowerCase(),
      );

    return packages.filter((p) => (p.id === "elite_plus" ? businessOwner : true));
  }, [userData]);

  // Free members are granted a 3-year free Silver membership.
  const isFreePromoSilver = useMemo(() => {
    if (!userData) return false;
    const t = normalizeTier(userData.membership_tier);
    return t === "" || t === "free";
  }, [userData]);

  const currentTierLabel = useMemo(() => {
    const t = normalizeTier(userData?.membership_tier);
    return TIER_LABEL[t] || (t ? t.replace(/_/g, " ") : "Free");
  }, [userData]);



  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [cadence, setCadence] = useState<"monthly" | "yearly">("monthly");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [paymentOption, setPaymentOption] = useState<"full" | "installment">("full");
  const [upgradeInProgress, setUpgradeInProgress] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [showAgreement, setShowAgreement] = useState(false);

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-paypal-subscription", {
        body: { subscription_row_id: subscription?.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Cancel failed");
      const when = data.expires_at ? new Date(data.expires_at).toLocaleDateString() : "the end of your billing period";
      toast({
        title: "Subscription cancelled",
        description: `You'll keep your benefits until ${when}.`,
      });
      setShowCancelConfirm(false);
      await Promise.all([refetchSubscription(), refetchUser()]);
    } catch (e: any) {
      toast({ title: "Cancel failed", description: e?.message || "Please try again", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  // Calculate display prices based on selected cadence. Must be before any early returns.
  const displayPrice = useMemo(() => {
    return (id: string) => {
      if (id === "silver") return cadence === "yearly" ? 49.99 : 4.99;
      if (id === "gold") return cadence === "yearly" ? 99.99 : 11.99;
      if (id === "diamond") return cadence === "yearly" ? 150.0 : 14.99;
      if (id === "elite") return cadence === "yearly" ? 10000.0 : 861.75;
      if (id === "elite_plus") return cadence === "yearly" ? 15000.0 : 1500.0; // monthly shows first-payment
      return 0;
    };
  }, [cadence]);


  const AgreementModal = () => (
    <Dialog open={showAgreement} onOpenChange={setShowAgreement}>
      <DialogContent className="max-h-[80vh] overflow-y-auto bg-gray-900 text-white border-pink-500">
        <DialogHeader>
          <DialogTitle className="text-pink-400 text-xl">HOUSING ANGELS, LLC</DialogTitle>
          <DialogDescription className="text-white">STRIPPER & EXOTIC FEMALE PARTICIPATION AGREEMENT</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="font-semibold">Annual Compensation Guarantee Program – Diamond Plus Membership</p>
          <p>Housing Angels, LLC offers a guaranteed <strong>$200,000 annual compensation</strong> to the first 300 approved Strippers and Exotic Females who meet all program requirements. Payments are issued bi weekly in the amount of up to <strong>$8,000.00</strong> max.</p>
          <p>The guarantee begins once the platform DimesOnly.World has reached a verified user base of <strong>1,000 Female Stripper/Exotic</strong> profiles, and <strong>3,000 Male or Female "Normal"</strong> profiles.</p>
          <h3 className="font-bold text-pink-400">1. Program Overview</h3>
          <p className="ml-4">See above description of the annual compensation guarantee.</p>
          <h3 className="font-bold text-pink-400">2. Membership Fee</h3>
          <ul className="list-disc ml-6 space-y-2">
            <li>Participant must enroll in <strong>Diamond Plus Membership</strong>.</li>
            <li>Diamond Plus Membership Fee: <strong>$349.00</strong> (includes online notary fee) — one-time, non-refundable.</li>
            <li>Payment confirms commitment and eligibility for bi weekly payments upon meeting all requirements.</li>
          </ul>
          <h3 className="font-bold text-pink-400">3. Participant Requirements (Per Bi Weekly Period)</h3>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Weekly Referrals:</strong> 7 new verified referrals per week (84 per quarter) — Deduction: <strong>$28.27</strong> per missing referral per week.</li>
            <li><strong>Weekly Content Uploads:</strong> 7 new photos/videos per week (168 total) — Deduction: <strong>$14.14</strong> per missing upload.</li>
            <li><strong>Event Participation:</strong> 1 event per month (3 per quarter) — Deduction: <strong>$500</strong> per missed event.</li>
            <li><strong>New User Engagement:</strong> Send 7 weekly messages to new users not referred by you (84 per quarter) — Deduction: <strong>$28.27</strong> per missing message per week.</li>
          </ul>
          <h3 className="font-bold text-pink-400">4. Compensation Terms</h3>
          <p>If all bi weekly requirements are met, Participant will receive up to <strong>$8,000</strong> every 2 weeks (<strong>$200,000</strong> annually max). Proportional deductions apply for missed items.</p>
          <h3 className="font-bold text-pink-400">5. Diamond Membership Plus Clause</h3>
          <p>If Participant earns <strong>$12,000</strong> or more in platform income during any bi weekly period, the $8,000 guarantee becomes void permanently and future income will be based solely on earned revenue.</p>
          <h3 className="font-bold text-pink-400">6. Terms & Termination</h3>
          <p>Agreement remains in effect as long as the Participant is one of the first 300 approved Stripper/Exotic members, complies with all requirements, and remains in good standing. Failure to meet obligations or community standards may result in termination.</p>
          <h3 className="font-bold text-pink-400">7. Notarization & Activation</h3>
          <p>This agreement must be digitally signed and notarized. Once notarized and the <strong>$349</strong> payment is received, Diamond Plus Membership will be activated.</p>
          <h3 className="font-bold text-pink-400">8. Signature & Acknowledgment</h3>
          <p>By signing, Participant acknowledges and agrees to all terms and confirms enrollment in the Diamond Plus Membership tier.</p>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (userLoading) {
    return <AngelLoader variant="fullscreen" />;
  }

  // Upgrade page is open to everyone; checkout requires sign-in.


  if (!selectedPackage) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-4">UPGRADE YOUR MEMBERSHIP</h1>
              <div className="inline-flex bg-black/50 border border-pink-500 rounded-full overflow-hidden">
                <button
                  className={`px-4 py-2 text-sm font-semibold transition ${cadence === 'monthly' ? 'bg-pink-500 text-white' : 'text-pink-300 hover:text-white'}`}
                  onClick={() => setCadence('monthly')}
                >
                  Monthly
                </button>
                <button
                  className={`px-4 py-2 text-sm font-semibold transition ${cadence === 'yearly' ? 'bg-pink-500 text-white' : 'text-pink-300 hover:text-white'}`}
                  onClick={() => setCadence('yearly')}
                >
                  Yearly
                </button>
              </div>
            </div>
            {!userData && (
              <Card className="bg-black/60 border-2 border-pink-500 text-white mb-6">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <p className="text-pink-200">Browse all packages freely. Sign in to complete an upgrade.</p>
                  <Button onClick={() => navigate('/login')} className="bg-gradient-to-r from-pink-500 to-purple-600">
                    Sign In
                  </Button>
                </CardContent>
              </Card>
            )}

            {subscription && (
              <Card className="bg-black/80 border-2 border-fuchsia-500 text-white mb-6">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-300">Current subscription</p>
                    <p className="text-xl font-bold capitalize">
                      {subscription.tier} · {subscription.cadence}
                    </p>
                    {subscription.status === "cancelled" ? (
                      <p className="text-yellow-300 text-sm mt-1">
                        Cancellation scheduled — benefits active until{" "}
                        {subscription.membership_expires_at
                          ? new Date(subscription.membership_expires_at).toLocaleDateString()
                          : "end of billing period"}
                        .
                      </p>
                    ) : (
                      <p className="text-gray-300 text-sm mt-1">
                        Next billing:{" "}
                        {subscription.next_billing_time
                          ? new Date(subscription.next_billing_time).toLocaleDateString()
                          : "—"}
                      </p>
                    )}
                  </div>
                  {subscription.status === "active" && (
                    <Button
                      variant="outline"
                      className="border-red-500 text-red-400 hover:bg-red-500/20"
                      onClick={() => setShowCancelConfirm(true)}
                    >
                      Cancel subscription
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {userData && (
              <Card className="bg-black/80 border-2 border-pink-500 text-white mb-6">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-300">Your current membership</p>
                    <p className="text-xl font-bold text-pink-400">
                      {isFreePromoSilver ? 'Silver' : currentTierLabel}
                    </p>
                    {isFreePromoSilver && (
                      <p className="text-xs text-gray-300 mt-1">Free 3-Year Silver Membership</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="bg-gray-700 text-white">
                    {isFreePromoSilver ? 'Free 3-Year Silver' : 'Current plan'}
                  </Badge>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {visiblePackages.map((pkg) => {
                const rawTier = normalizeTier(userData?.membership_tier);
                const tier = isFreePromoSilver ? 'silver' : rawTier;
                const currentRank = rankOf(tier);
                const pkgRank = rankOf(pkg.id);
                const isCurrent = tier === pkg.id;
                const isFreeSilverBadge = isFreePromoSilver && pkg.id === 'silver';
                const isSilverPlusLock = tier === 'silver_plus' && pkg.id === 'silver';
                const isDiamondPlusLock = tier === 'diamond_plus' && pkg.id === 'diamond';
                const isBelow = !isCurrent && !isSilverPlusLock && !isDiamondPlusLock && pkgRank < currentRank;
                const isLocked = isCurrent || isBelow || isSilverPlusLock || isDiamondPlusLock;


                return (
                  <Card
                    key={pkg.id}
                    className={`bg-black/80 border-2 border-pink-500 text-white transition-transform ${
                      isLocked ? 'opacity-60 cursor-not-allowed grayscale' : 'cursor-pointer hover:scale-105'
                    }`}
                    onClick={() => {
                      if (isLocked) return; // disable navigation for current, lower tiers, or lifetime plus
                      if (!userData) return navigate('/login');

                      if (pkg.id === 'silver') return navigate(`/upgrade-silver-subscribe?cadence=${cadence}`);
                      if (pkg.id === 'diamond') return navigate(`/upgrade-diamond-monthly?cadence=${cadence}`);
                      if (pkg.id === 'gold') return navigate(`/upgrade-gold?cadence=${cadence}`);
                      if (pkg.id === 'elite') return navigate(`/elite?tier=elite&cadence=${cadence}`);
                      if (pkg.id === 'elite_plus') return navigate(`/elite?tier=elite_plus&cadence=${cadence}`);

                      // fallback to original behavior for other packages
                      setSelectedPackage(pkg);
                      setPaymentOption('full');
                      if (userData) setPhoneNumber(userData.phone_number ?? '');
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-pink-400 text-xl">{pkg.name}</CardTitle>
                        {isFreeSilverBadge ? (
                          <Badge variant="secondary" className="bg-green-700 text-white">Free 3-Year Silver</Badge>
                        ) : (
                          isCurrent && <Badge variant="secondary" className="bg-gray-700 text-white">Current plan</Badge>
                        )}
                        {(isSilverPlusLock || isDiamondPlusLock) && <Badge variant="secondary" className="bg-gray-700 text-white">Lifetime Plus</Badge>}
                        {isBelow && <Badge variant="secondary" className="bg-gray-700 text-white">Included</Badge>}
                      </div>
                      <CardDescription className="text-3xl font-bold text-white whitespace-pre-line">
                        ${displayPrice(pkg.id).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="block text-xs text-gray-300 mt-1">
                          {pkg.id === 'elite_plus' && cadence === 'yearly'
                            ? 'one-time lifetime'
                            : pkg.id === 'elite_plus' && cadence === 'monthly'
                              ? 'first payment • then $1,250/mo × 11'
                              : cadence === 'yearly' ? 'per year' : 'per month'}
                        </span>
                      </CardDescription>
                      {pkg.badge && <Badge className="bg-red-600 text-white">{pkg.badge}</Badge>}
                      {pkg.savings && <Badge className="bg-green-600 text-white">{pkg.savings}</Badge>}
                      {pkg.warning && <p className="text-red-400 font-bold">{pkg.warning}</p>}
                      {pkg.id === 'diamond' && cadence === 'yearly' && (
                        <p className="text-yellow-300 text-sm font-semibold">Billed as $53.25 every 4 months (3x per year)</p>
                      )}

                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 mb-6">
                        {pkg.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:bg-gray-700 disabled:text-gray-300"
                        disabled={isLocked}
                      >
                        {isCurrent
                          ? 'Current plan'
                          : isSilverPlusLock
                            ? 'You are Silver Plus member (lifetime)'
                            : isDiamondPlusLock
                              ? 'You are Diamond Plus member (lifetime)'
                              : isBelow
                                ? 'Included in your plan'
                                : 'UPGRADE NOW'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>


            {userData && ["stripper", "exotic"].includes(userData.user_type) && (
              <div className="text-center mt-12">
                <Button
                  variant="outline"
                  className="border-pink-500 text-pink-400 hover:bg-pink-500/20"
                  onClick={() => setShowAgreement(true)}
                >
                  View Agreement
                </Button>
              </div>
            )}

            <AgreementModal />

            <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
              <DialogContent className="bg-gray-900 text-white border-red-500">
                <DialogHeader>
                  <DialogTitle className="text-red-400">Cancel subscription?</DialogTitle>
                  <DialogDescription className="text-gray-300">
                    You'll keep your <span className="capitalize font-semibold">{subscription?.tier}</span> benefits until{" "}
                    {subscription?.next_billing_time
                      ? new Date(subscription.next_billing_time).toLocaleDateString()
                      : subscription?.membership_expires_at
                        ? new Date(subscription.membership_expires_at).toLocaleDateString()
                        : "the end of your current billing period"}
                    . After that, your account will return to Silver.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="border-gray-500 text-gray-200 hover:bg-gray-800"
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={cancelling}
                  >
                    Keep subscription
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                  >
                    {cancelling ? "Cancelling…" : "Yes, cancel"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

          </div>
        </div>
      </AppLayout>
    );
  }

  // The detailed checkout view remains for non-routed packages
  const installmentAllowed = !!selectedPackage.installmentCount;

  const resetState = () => {
    setSelectedPackage(null);
    setPaymentOption("full");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button className="flex items-center gap-2 text-sm mb-6 text-gray-400 hover:text-white" onClick={resetState}>
          <ArrowLeft className="w-4 h-4" /> Back to packages
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">{selectedPackage.name}</h1>
          <p className="text-3xl font-bold text-yellow-400 mb-1">${selectedPackage.price.toFixed(2)}</p>
          {selectedPackage.subtitle && (<p className="text-yellow-300 font-semibold mb-1">{selectedPackage.subtitle}</p>)}
          {selectedPackage.monthly && (<p className="text-sm text-gray-400">{selectedPackage.monthly}</p>)}
        </div>

        {installmentAllowed && (
          <Card className="bg-white/10 backdrop-blur border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-white">Choose Your Payment Option</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${paymentOption === 'full' ? 'border-pink-400 bg-pink-400/10' : 'border-gray-600 hover:border-gray-500'}`} onClick={() => setPaymentOption('full')}>
                  <div className="text-center">
                    <CreditCard className="w-8 h-8 text-pink-400 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-white mb-2">Full Payment</h3>
                    <div className="text-3xl font-bold text-pink-400 mb-2">${selectedPackage.price.toFixed(2)}</div>
                    <p className="text-gray-300 text-sm">One-time payment, immediate activation</p>
                  </div>
                </div>
                <div className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${paymentOption === 'installment' ? 'border-pink-400 bg-pink-400/10' : 'border-gray-600 hover:border-gray-500'}`} onClick={() => setPaymentOption('installment')}>
                  <div className="text-center">
                    <Calendar className="w-8 h-8 text-pink-400 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-white mb-2">{selectedPackage.installmentCount} Installments</h3>
                    <div className="text-lg font-bold text-pink-400 mb-1">${selectedPackage.installmentAmount?.toFixed(2)} each</div>
                    <div className="text-sm text-gray-400 mb-2">× {selectedPackage.installmentCount} payments</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/10 backdrop-blur border-white/20 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Phone className="w-5 h-5" /> Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone" className="text-gray-300">Phone Number (Required for PayPal)</Label>
                <Input id="phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="(555) 123-4567" className="bg-white/20 border-white/30 text-white" />
              </div>
              <div>
                <Label className="text-gray-300">Email</Label>
                <Input type="email" value={userData?.email ?? ''} disabled className="bg-gray-800 border-gray-600 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Non-routed packages would need their own handleUpgrade; omitted here */}
        <div className="text-center text-gray-400">Select a package above.</div>
      </div>
    </div>
  );
};

const queryClient = new QueryClient();

const UpgradePage: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AuthGuard>
      <UpgradePageInner />
    </AuthGuard>
  </QueryClientProvider>
);

export default UpgradePage;
