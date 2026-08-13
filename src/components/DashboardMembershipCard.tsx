import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Check, Lock, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resolveMembership, MEMBERSHIP_OPTIONS } from "@/lib/membership";
import {
  getPlusUpgradeTarget,
  getFreeTierLabel,
  isBusinessOwner as checkBusinessOwner,
  isEntertainer,
} from "@/lib/freeMembership";

interface DashboardMembershipCardProps {
  userData: any;
}

const NEXT_TIER_BENEFITS: Record<string, string[]> = {
  silver_plus: [
    "Earn 20% of tips from your entertainers",
    "10% override on every referral purchase",
    "10% discount site-wide, forever",
  ],
  diamond_plus: [
    "Top placement in the Dimes carousels",
    "Higher tip share plus profit-sharing position",
    "Priority access to every event and reunion",
  ],
  elite_plus: [
    "Full access to every area of the site",
    "$15,000 lifetime, or 12 monthly payments",
    "Priority VIP treatment at every event",
  ],
};

const DashboardMembershipCard: React.FC<DashboardMembershipCardProps> = ({
  userData,
}) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null);

  const membership = resolveMembership(userData);
  const target = getPlusUpgradeTarget(userData);
  const isMaxTier = membership.rank >= 7;
  const benefits = NEXT_TIER_BENEFITS[target.key] || [];
  const nextLabel = target.label.replace("Lifetime ", "");

  useEffect(() => {
    if (isMaxTier) return;
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isMaxTier]);

  useEffect(() => {
    let cancelled = false;
    if (target.key === "silver_plus") {
      supabase.rpc("check_silver_plus_availability").then(({ data }) => {
        const row = Array.isArray(data) ? (data[0] as any) : null;
        if (!cancelled && row) setSeatsLeft(Number(row.remaining ?? 0));
      });
    } else if (target.key === "elite_plus") {
      setSeatsLeft(null);
    }
    return () => {
      cancelled = true;
    };
  }, [target.key]);

  const tierChips = MEMBERSHIP_OPTIONS.filter((option) => option.rank > 0).map(
    (option) => ({ ...option, unlocked: option.rank <= membership.rank }),
  );

  return (
    <>
      <Card
        ref={cardRef}
        className="mb-6 overflow-hidden border-border/60 bg-dimes-surface animate-fade-in"
      >
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your membership
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Crown className="h-5 w-5 text-dimes-gold" />
                <h3 className="text-2xl font-black">{membership.label}</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {membership.rank >= 2
                  ? "Lifetime benefits active on your account."
                  : `${getFreeTierLabel(userData)} — included for 3 years.`}
              </p>
            </div>

            {!isMaxTier && (
              <div className="text-right">
                {seatsLeft !== null && seatsLeft > 0 && (
                  <p className="mb-2 text-xs font-semibold text-dimes-gold">
                    Only {seatsLeft} positions left
                  </p>
                )}
                {target.key === "elite_plus" && (
                  <p className="mb-2 text-xs font-semibold text-dimes-gold">
                    Only 100 seats available
                  </p>
                )}
                <Button
                  onClick={() => navigate(target.href)}
                  className="bg-dimes-magenta font-semibold text-white hover:bg-dimes-magenta/90"
                >
                  Upgrade to {nextLabel}
                  <ArrowUpRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {!isMaxTier && benefits.length > 0 && (
            <div className="mt-5 rounded-xl border border-dimes-magenta/30 bg-dimes-surface-elevated p-4">
              <p className="mb-3 text-sm font-semibold">
                What {nextLabel} unlocks
              </p>
              <ul className="space-y-2">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lockedTiers.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {lockedTiers.map((tier) => (
                <span
                  key={tier.key}
                  className="inline-flex cursor-not-allowed items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground opacity-60"
                >
                  <Lock className="h-3 w-3" />
                  {tier.label}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showSticky && !isMaxTier && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-dimes-surface/95 p-3 backdrop-blur md:hidden">
          <Button
            onClick={() => navigate(target.href)}
            className="w-full bg-dimes-magenta py-5 font-semibold text-white hover:bg-dimes-magenta/90"
          >
            Upgrade to {nextLabel}
          </Button>
        </div>
      )}
    </>
  );
};

export default DashboardMembershipCard;
