import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, DollarSign, Trophy, Users, Share2, ArrowUpRight } from "lucide-react";
import { resolveMembership, MEMBERSHIP_OPTIONS } from "@/lib/membership";
import { getPlusUpgradeTarget } from "@/lib/freeMembership";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useToast } from "@/hooks/use-toast";

interface DashboardCommandBarProps {
  userData: any;
  completion: number; // 0-100
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);

/** Animated count-up for the headline earnings number. */
const useCountUp = (target: number, active: boolean) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const total = 30;
    const id = window.setInterval(() => {
      frame += 1;
      setValue(target * (frame / total));
      if (frame >= total) {
        setValue(target);
        window.clearInterval(id);
      }
    }, 16);
    return () => window.clearInterval(id);
  }, [target, active]);
  return value;
};

const DashboardCommandBar: React.FC<DashboardCommandBarProps> = ({
  userData,
  completion,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { stats, loading } = useDashboardStats(userData?.id, userData?.username);
  const membership = resolveMembership(userData);
  const upgradeTarget = getPlusUpgradeTarget(userData);
  const animatedEarnings = useCountUp(stats.availableEarnings, !loading);

  const displayName =
    userData?.first_name || userData?.username || "Member";
  const initials = String(displayName).slice(0, 1).toUpperCase();
  const isMaxTier = membership.rank >= 7;
  const upgradeTargetRank =
    MEMBERSHIP_OPTIONS.find((o) => o.key === upgradeTarget.key)?.rank ?? 99;
  // Never offer a "Plus" upgrade the member already meets or exceeds
  // (e.g. a Diamond Plus member should not see "Upgrade to Silver Plus").
  const showPlusUpgrade = !isMaxTier && membership.rank < upgradeTargetRank;

  const shareLink = `https://DimesOnly.World?ref=${userData?.username || ""}`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Dimes Only World",
          text: "Join me on Dimes Only World",
          url: shareLink,
        });
      } else {
        await navigator.clipboard.writeText(shareLink);
        toast({ title: "Link copied", description: shareLink });
      }
      localStorage.setItem(`dimes-shared-link-${userData?.id}`, "1");
      window.dispatchEvent(new Event("dimes-checklist-updated"));
    } catch {
      /* user cancelled share */
    }
  };

  const kpis = [
    {
      label: "Available Earnings",
      value: formatCurrency(animatedEarnings),
      Icon: DollarSign,
      to: "/dashboard/earnings",
    },
    {
      label: "Jackpot Tickets",
      value: String(stats.jackpotTickets),
      Icon: Trophy,
      to: "/dashboard/jackpot",
    },
    {
      label: "Referrals Before App Launch",
      value: String(stats.referrals),
      Icon: Users,
      to: "/dashboard/referrals",
    },
  ];

  const ringStyle = {
    background: `conic-gradient(hsl(var(--dimes-magenta)) ${completion * 3.6}deg, hsl(var(--dimes-surface-elevated)) 0deg)`,
  };

  return (
    <Card className="mb-6 overflow-hidden border-border/60 bg-dimes-surface text-foreground shadow-lg animate-fade-in">
      <CardContent className="p-5 md:p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="relative h-16 w-16 shrink-0 rounded-full p-[3px]"
            style={ringStyle}
            aria-label={`Profile ${completion}% complete`}
          >
            <div className="h-full w-full rounded-full bg-dimes-surface p-[2px]">
              {userData?.profile_photo ? (
                <img
                  src={userData.profile_photo}
                  alt={`${displayName} profile`}
                  className="h-full w-full rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-dimes-surface-elevated text-lg font-bold text-foreground">
                  {initials}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h2 className="truncate text-xl font-bold md:text-2xl">
              @{userData?.username || "member"}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-dimes-gold/40 bg-dimes-gold/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-dimes-gold">
                <Crown className="h-3 w-3" />
                {membership.label} Member
              </span>
              <span className="text-xs text-muted-foreground">
                Profile {completion}% complete
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {showPlusUpgrade && (
              <Button
                onClick={() => navigate(upgradeTarget.href)}
                className="flex-1 bg-dimes-magenta font-semibold text-white hover:bg-dimes-magenta/90 sm:flex-none"
              >
                Upgrade to {upgradeTarget.label.replace("Lifetime ", "")}
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={() => navigate("/upgrade")}
              className="flex-1 bg-dimes-gold font-semibold text-black hover:bg-dimes-gold/90 sm:flex-none"
            >
              <Crown className="mr-1 h-4 w-4" />
              Upgrade
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="flex-1 border-border/60 sm:flex-none"
            >
              <Share2 className="mr-1 h-4 w-4" />
              Share My Link
            </Button>

          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {kpis.map(({ label, value, Icon, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className="group rounded-xl border border-border/60 bg-dimes-surface-elevated p-3 text-left transition-colors hover:border-dimes-magenta/60"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-6 w-20" />
              ) : (
                <div className="mt-1 text-lg font-bold md:text-2xl">{value}</div>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardCommandBar;
