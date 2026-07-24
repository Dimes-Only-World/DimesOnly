import React from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Star, Sparkles, Users, TrendingUp, CheckCircle2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

interface Plan {
  name: string;
  price: string;
  ref20: string;
  ref10: string;
  href?: string;
  highlight?: boolean;
  tag?: string;
}

const plans: Plan[] = [
  { name: "Silver", price: "$4.99", ref20: "$1.00", ref10: "$0.50", href: "/upgrade-silver" },
  { name: "Gold", price: "$11.99", ref20: "$2.40", ref10: "$1.20", href: "/upgrade-gold" },
  { name: "Diamond", price: "$14.99", ref20: "$3.00", ref10: "$1.50", href: "/upgrade-diamond-monthly" },
  { name: "Silver Yearly", price: "$49.99", ref20: "$10.00", ref10: "$5.00", href: "/upgrade-silver" },
  { name: "Gold Yearly", price: "$99.99", ref20: "$20.00", ref10: "$10.00", href: "/upgrade-gold" },
  { name: "Diamond Yearly", price: "$150.00", ref20: "$30.00", ref10: "$15.00", href: "/upgrade-diamond-monthly" },
  { name: "Silver Plus", price: "$249.99", ref20: "$50.00", ref10: "$25.00", href: "/upgrade-silver-plus", highlight: true, tag: "General Members" },
  { name: "Diamond Plus", price: "$149.99", ref20: "$30.00", ref10: "$15.00", href: "/upgrade-diamond", highlight: true, tag: "Female Entertainers" },
  { name: "Elite", price: "$10,000", ref20: "$2,000", ref10: "$1,000", href: "/elite" },
  { name: "Elite Plus", price: "$15,000", ref20: "$3,000", ref10: "$1,500", href: "/business-owner-elite", highlight: true, tag: "Business Owners" },
];

const volumes = [
  { label: "300 × Silver Plus", total: "$74,997", ref20: "$14,999.40", ref10: "$7,499.70" },
  { label: "300 × Diamond Plus", total: "$44,997", ref20: "$8,999.40", ref10: "$4,499.70" },
  { label: "100 × Elite", total: "$1,000,000", ref20: "$200,000", ref10: "$100,000" },
  { label: "100 × Elite Plus", total: "$1,500,000", ref20: "$300,000", ref10: "$150,000" },
];

const gold = "text-[#F4C860]";
const goldBg = "bg-[#F4C860]";
const goldBorder = "border-[#F4C860]/40";

const Memberships: React.FC = () => {
  const { user } = useApp();
  const gender = (user?.gender || "").toLowerCase();
  const userType = (user?.userType || "").toLowerCase();

  const isFemaleEntertainer = gender === "female" && (userType === "stripper" || userType === "exotic");
  const isGeneralMember = !isFemaleEntertainer && userType !== "business_owner" && userType !== "businessowner";
  const isBusinessOwner = userType === "business_owner" || userType === "businessowner";

  // If user isn't logged in, show all three
  const showAll = !user;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-black via-[#0b0710] to-black text-white">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
          {/* Header */}
          <div className="text-center mb-10 md:mb-14">
            <Badge className={`${goldBg} text-black font-semibold mb-4`}>Memberships & Upgrades</Badge>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Choose Your <span className={gold}>Membership</span>
            </h1>
            <p className="mt-4 text-white/70 max-w-2xl mx-auto text-sm md:text-base">
              Every membership sold through your referral link pays you a commission.
              Direct referrals earn <span className={gold}>20%</span>, upline referrals earn <span className={gold}>10%</span>.
            </p>
          </div>

          {/* Pricing table — mobile: cards, md+: table */}
          <div className="md:hidden space-y-3 mb-12">
            {plans.map((p) => (
              <Card key={p.name} className={`bg-white/[0.03] ${p.highlight ? goldBorder : "border-white/10"} border`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-lg">{p.name}</div>
                      {p.tag && <div className="text-xs text-white/50">{p.tag}</div>}
                    </div>
                    <div className={`text-xl font-bold ${gold}`}>{p.price}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                    <div className="bg-white/5 rounded p-2">
                      <div className="text-white/50 text-xs">20% Referral</div>
                      <div className={`font-semibold ${gold}`}>{p.ref20}</div>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                      <div className="text-white/50 text-xs">10% Referral</div>
                      <div className={`font-semibold ${gold}`}>{p.ref10}</div>
                    </div>
                  </div>
                  {p.href && (
                    <Link to={p.href} className="block mt-3">
                      <Button className={`w-full ${goldBg} text-black hover:brightness-110 font-semibold`}>Upgrade</Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden md:block mb-16 overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-white/70">
                <tr>
                  <th className="text-left p-4">Membership</th>
                  <th className="text-right p-4">Price</th>
                  <th className="text-right p-4">20% Referral</th>
                  <th className="text-right p-4">10% Referral</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.name} className={`border-t border-white/5 ${p.highlight ? "bg-[#F4C860]/[0.04]" : ""}`}>
                    <td className="p-4">
                      <div className="font-semibold">{p.name}</div>
                      {p.tag && <div className="text-xs text-white/50">{p.tag}</div>}
                    </td>
                    <td className={`p-4 text-right font-semibold ${gold}`}>{p.price}</td>
                    <td className="p-4 text-right">{p.ref20}</td>
                    <td className="p-4 text-right">{p.ref10}</td>
                    <td className="p-4 text-right">
                      {p.href && (
                        <Link to={p.href}>
                          <Button size="sm" className={`${goldBg} text-black hover:brightness-110 font-semibold`}>Upgrade</Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Volume examples */}
          <div className="mb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Volume Referral Examples</h2>
            <p className="text-white/60 mb-6 text-sm">What full tiers look like when they sell out.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {volumes.map((v) => (
                <Card key={v.label} className={`bg-white/[0.03] border ${goldBorder}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className={`w-5 h-5 ${gold}`} />
                      <div className="font-semibold">{v.label}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-white/50 text-xs">Total</div>
                        <div className={`font-bold ${gold}`}>{v.total}</div>
                      </div>
                      <div>
                        <div className="text-white/50 text-xs">20% Pool</div>
                        <div className="font-semibold">{v.ref20}</div>
                      </div>
                      <div>
                        <div className="text-white/50 text-xs">10% Pool</div>
                        <div className="font-semibold">{v.ref10}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Role-based profit sharing */}
          <div className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-center">Profit Sharing Program</h2>
            <p className="text-center text-white/60 max-w-2xl mx-auto text-sm">
              Early upgraders unlock quarterly profit sharing once all founding seats are filled.
            </p>

            {(showAll || isFemaleEntertainer) && (
              <RoleCard
                icon={<Sparkles className={`w-6 h-6 ${gold}`} />}
                eyebrow="Exclusive for Female Entertainers"
                title="Diamond Plus — Up to $125,000 / year"
                quarterly="Paid quarterly — maximum $31,250 per quarter"
                body="The first 300 female entertainers who upgrade to Diamond Plus receive up to $125,000 per year. Profit sharing activates once 300 female entertainers, 300 general members, and 100 business owners have upgraded (total 700). After the full 700 are filled, Tier 1 begins. When company revenue reaches the Tier 2 threshold, everyone moves to a higher tier with a $2,500,000 annual minimum. If revenue later drops below the Tier 2 threshold, Tier 1 is restored."
                cta={{ label: "Upgrade to Diamond Plus", href: "/upgrade-diamond" }}
              />
            )}

            {(showAll || isGeneralMember) && (
              <RoleCard
                icon={<Users className={`w-6 h-6 ${gold}`} />}
                eyebrow="Exclusive for Males & Females"
                title="Silver Plus — Up to $75,000 / year"
                quarterly="Paid quarterly — maximum $18,750 per quarter"
                body="The first 300 general members who upgrade to Silver Plus receive up to $75,000 per year. Profit sharing activates once 300 female entertainers, 300 general members, and 100 business owners have upgraded (total 700). After the full 700 are filled, Tier 1 begins. When company revenue reaches the Tier 2 threshold, everyone moves to a higher tier with a $2,500,000 annual minimum. If revenue later drops below the Tier 2 threshold, Tier 1 is restored."
                cta={{ label: "Upgrade to Silver Plus", href: "/upgrade-silver-plus" }}
              />
            )}

            {(showAll || isBusinessOwner) && (
              <RoleCard
                icon={<Crown className={`w-6 h-6 ${gold}`} />}
                eyebrow="Exclusive for Business Owners"
                title="Elite Plus — Up to $200,000 / year"
                quarterly="Paid quarterly — maximum $50,000 per quarter"
                body="The first 100 business owners who upgrade to Elite Plus receive up to $200,000 per year. Profit sharing activates once 300 female entertainers, 300 general members, and 100 business owners have upgraded (total 700). After the full 700 are filled, Tier 1 begins. When company revenue reaches the Tier 2 threshold, everyone moves to a higher tier with a $2,500,000 annual minimum. If revenue later drops below the Tier 2 threshold, Tier 1 is restored."
                cta={{ label: "Upgrade to Elite Plus", href: "/business-owner-elite" }}
              />
            )}
          </div>

          <div className="text-center text-xs text-white/40 mt-12">
            Referral commissions are paid on every membership sold through your unique link.
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

const RoleCard: React.FC<{
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  quarterly: string;
  body: string;
  cta: { label: string; href: string };
}> = ({ icon, eyebrow, title, quarterly, body, cta }) => (
  <Card className={`bg-gradient-to-br from-white/[0.04] to-white/[0.01] border ${goldBorder}`}>
    <CardHeader className="pb-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs uppercase tracking-wider text-white/60">{eyebrow}</span>
      </div>
      <CardTitle className={`text-xl md:text-2xl ${gold}`}>{title}</CardTitle>
      <div className="text-white/70 text-sm">{quarterly}</div>
    </CardHeader>
    <CardContent>
      <p className="text-white/80 leading-relaxed text-sm md:text-base">{body}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to={cta.href}>
          <Button className={`${goldBg} text-black hover:brightness-110 font-semibold`}>
            <Star className="w-4 h-4 mr-2" />
            {cta.label}
          </Button>
        </Link>
        <div className="flex items-center text-xs text-white/50 gap-2">
          <CheckCircle2 className={`w-4 h-4 ${gold}`} />
          Quarterly profit sharing eligible
        </div>
      </div>
    </CardContent>
  </Card>
);

export default Memberships;
