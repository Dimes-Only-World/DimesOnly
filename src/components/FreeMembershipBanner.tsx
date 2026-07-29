import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-background to-background">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">{status.label}</span>
              <Badge variant="secondary">{FREE_MEMBERSHIP_YEARS} Years Free</Badge>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {status.launched && status.expiresAt
                ? `Active now — your free ${FREE_MEMBERSHIP_YEARS} years run through ${status.expiresAt.toLocaleDateString()}${
                    status.daysRemaining !== null ? ` (${status.daysRemaining} days left)` : ""
                  }.`
                : `Your ${FREE_MEMBERSHIP_YEARS} free years start the day the app is publicly released — the clock hasn't started yet.`}
            </p>
            <p className="text-sm text-muted-foreground">
              Want it forever? Upgrade to{" "}
              <span className="font-medium text-foreground">{plus.label}</span> now and your
              membership starts immediately.
            </p>
          </div>

          <div className="flex flex-col gap-2 md:min-w-[220px]">
            <Link to={plus.href}>
              <Button className="w-full">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to {plus.label}
              </Button>
            </Link>
            <Link to="/upgrade">
              <Button variant="outline" className="w-full">
                Upgrade Membership
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FreeMembershipBanner;
