import React, { useState } from "react";
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
      "Profit share 10% of companies gross sales FOREVER split among the first 300 dancers.",
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
];

const fetchUserData = async (): Promise<UserData | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("users")
    .select(
      "id, username, user_type, membership_tier, diamond_plus_active, phone_number, email"
    )
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return profile as UserData;
};

const UpgradePageInner: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: userData, isLoading: userLoading } = useQuery<UserData | null, Error>({
    queryKey: ["user"],
    queryFn: fetchUserData,
  });

  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [paymentOption, setPaymentOption] = useState<"full" | "installment">("full");
  const [upgradeInProgress, setUpgradeInProgress] = useState(false);

  const [showAgreement, setShowAgreement] = useState(false);

  const AgreementModal = () => (
    <Dialog open={showAgreement} onOpenChange={setShowAgreement}>
      <DialogContent className="max-h-[80vh] overflow-y-auto bg-gray-900 text-white border-pink-500">
        <DialogHeader>
          <DialogTitle className="text-pink-400 text-xl">HOUSING ANGELS, LLC</DialogTitle>
          <DialogDescription className="text-white">STRIPPER & EXOTIC FEMALE PARTICIPATION AGREEMENT</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="font-semibold">Annual Compensation Guarantee Program – Diamond Plus Membership</p>
          <p>Housing Angels, LLC offers a guaranteed <strong>$25,000 annual compensation</strong> to the first 300 approved Strippers and Exotic Females who meet all program requirements. Payments are issued quarterly in the amount of <strong>$6,250.00</strong>.</p>
          <p>The guarantee begins once the platform DimesOnly.World has reached a verified user base of <strong>1,000 Female Stripper/Exotic</strong> profiles, and <strong>3,000 Male or Female "Normal"</strong> profiles.</p>
          <h3 className="font-bold text-pink-400">1. Program Overview</h3>
          <p className="ml-4">See above description of the annual compensation guarantee.</p>
          <h3 className="font-bold text-pink-400">2. Membership Fee</h3>
          <ul className="list-disc ml-6 space-y-2">
            <li>Participant must enroll in <strong>Diamond Plus Membership</strong>.</li>
            <li>Diamond Plus Membership Fee: <strong>$349.00</strong> (includes online notary fee) — one-time, non-refundable.</li>
            <li>Payment confirms commitment and eligibility for quarterly payments upon meeting all requirements.</li>
          </ul>
          <h3 className="font-bold text-pink-400">3. Participant Requirements (Per Quarter)</h3>
          <ul className="list-disc ml-6 space-y-2">
            <li><strong>Weekly Referrals:</strong> 7 new verified referrals per week (84 per quarter) — Deduction: <strong>$28.27</strong> per missing referral per week.</li>
            <li><strong>Weekly Content Uploads:</strong> 7 new photos/videos per week (168 total) — Deduction: <strong>$14.14</strong> per missing upload.</li>
            <li><strong>Event Participation:</strong> 1 event per month (3 per quarter) — Deduction: <strong>$500</strong> per missed event.</li>
            <li><strong>New User Engagement:</strong> Send 7 weekly messages to new users not referred by you (84 per quarter) — Deduction: <strong>$28.27</strong> per missing message per week.</li>
          </ul>
          <h3 className="font-bold text-pink-400">4. Compensation Terms</h3>
          <p>If all quarterly requirements are met, Participant will receive <strong>$6,250</strong> every 3 months (<strong>$25,000</strong> annually). Proportional deductions apply for missed items.</p>
          <h3 className="font-bold text-pink-400">5. Diamond Membership Plus Clause</h3>
          <p>If Participant earns <strong>$12,000</strong> or more in platform income during any quarter, the $6,250 guarantee becomes void permanently and future income will be based solely on earned revenue.</p>
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-red-900">
        <span className="text-white text-xl">Loading...</span>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-red-900">
        <Card className="bg-red-900/20 border-red-500">
          <CardContent className="p-8 text-center">
            <h2 className="text-red-400 font-bold text-xl mb-2">Access Denied</h2>
            <p className="text-red-300">Please log in to access the upgrade page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedPackage) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-4">UPGRADE YOUR MEMBERSHIP</h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className="bg-black/80 border-2 border-pink-500 text-white cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => {
                    if (pkg.id === 'silver') return navigate('/upgrade-silver-plus');
                    if (pkg.id === 'diamond') return navigate('/upgrade-diamond');
                    // fallback to original behavior for other packages
                    setSelectedPackage(pkg);
                    setPaymentOption('full');
                    if (userData) setPhoneNumber(userData.phone_number ?? '');
                  }}
                >
                  <CardHeader>
                    <CardTitle className="text-pink-400 text-xl">{pkg.name}</CardTitle>
                    <CardDescription className="text-3xl font-bold text-white">${pkg.price.toFixed(2)}</CardDescription>
                    {pkg.badge && <Badge className="bg-red-600 text-white">{pkg.badge}</Badge>}
                    {pkg.savings && <Badge className="bg-green-600 text-white">{pkg.savings}</Badge>}
                    {pkg.warning && <p className="text-red-400 font-bold">{pkg.warning}</p>}
                    {pkg.subtitle && <p className="text-yellow-400 font-bold">{pkg.subtitle}</p>}
                    {pkg.monthly && <p className="text-sm text-gray-300">{pkg.monthly}</p>}
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
                    <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                      UPGRADE NOW
                    </Button>
                  </CardContent>
                </Card>
              ))}
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
                <Input type="email" value={userData!.email} disabled className="bg-gray-800 border-gray-600 text-gray-400" />
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
