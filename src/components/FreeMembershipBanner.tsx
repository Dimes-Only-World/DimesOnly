import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Clock, Crown } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import {
  buildFreeMembershipStatus,
  fetchAppLaunchDate,
  getPlusUpgradeTarget,
  FREE_MEMBERSHIP_YEARS,
  type FreeMembershipStatus,
} from "@/lib/freeMembership";
import { resolveMembership } from "@/lib/membership";

const FreeMembershipBanner: React.FC = () => {
  const { user } = useAppContext();
  const [status, setStatus] = useState<FreeMembershipStatus | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) return;
    fetchAppLaunchDate().then((launch) => {
      if (active) setStatus(buildFreeMembershipStatus(user, launch));
    });
    return () => {
      active = false;
    };
  }, [user]);

  if (!user || !status) return null;

  const current = resolveMembership(user);
  // Members who already hold a lifetime Plus tier don't need this banner.
  if (current.rank >= 2) return null;

  const plus = getPlusUpgradeTarget(user);

  return (
    <Card className="relative overflow-hidden border-0 mb-6 shadow-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Decorative glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-slate-300/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />

      <CardContent className="relative p-5 md:p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-br from-slate-100 to-slate-400 shadow-lg">
              <Gift className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Included · No Payment Required
              </div>
              <CardTitle className="text-2xl md:text-3xl font-black bg-gradient-to-r from-slate-100 via-white to-slate-300 bg-clip-text text-transparent mt-1">
                {status.label}
              </CardTitle>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-widest text-white/60">Free Access</div>
            <div className="text-2xl font-bold text-white">
              {FREE_MEMBERSHIP_YEARS}<span className="text-white/40 text-base"> Years</span>
            </div>
          </div>
        </div>

        <p className="text-white/80 text-sm md:text-base leading-relaxed max-w-2xl">
          Want it forever? Upgrade to{" "}
          <span className="font-semibold text-white">{plus.label}</span> now and your membership
          starts immediately — no waiting for launch day.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-widest text-slate-300/80">Status</div>
            <div className="text-lg font-bold text-white mt-1">
              {status.launched ? "Active" : "Pending Launch"}
            </div>
            <div className="text-[11px] text-white/60">Current membership</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-widest text-slate-300/80">Free Term</div>
            <div className="text-lg font-bold text-white mt-1">{FREE_MEMBERSHIP_YEARS} Years</div>
            <div className="text-[11px] text-white/60">
              {status.launched && status.expiresAt
                ? `Through ${status.expiresAt.toLocaleDateString()}`
                : "Starts at public release"}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-widest text-slate-300/80">Upgrade</div>
            <div className="text-lg font-bold text-white mt-1">Lifetime</div>
            <div className="text-[11px] text-white/60">{plus.label}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link to={plus.href} className="flex-1">
            <Button className="w-full h-14 text-base md:text-lg font-bold bg-gradient-to-r from-slate-100 via-white to-slate-300 hover:from-white hover:to-slate-200 text-black shadow-xl shadow-slate-400/20 transition-transform hover:scale-[1.01]">
              <Crown className="w-5 h-5 mr-2" />
              Upgrade to {plus.label}
            </Button>
          </Link>
          <Link to="/upgrade" className="sm:w-56">
            <Button
              variant="outline"
              className="w-full h-14 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              Compare Memberships
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-white/50 text-center">
          <Clock className="w-3 h-3 shrink-0" />
          <span>
            {status.launched && status.expiresAt
              ? `Your free ${FREE_MEMBERSHIP_YEARS} years run through ${status.expiresAt.toLocaleDateString()}${
                  status.daysRemaining !== null ? ` (${status.daysRemaining} days left)` : ""
                }.`
              : `Your ${FREE_MEMBERSHIP_YEARS} free years start the day the app is publicly released — the clock hasn't started yet.`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default FreeMembershipBanner;
