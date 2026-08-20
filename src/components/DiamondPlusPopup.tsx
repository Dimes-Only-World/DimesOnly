import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, DollarSign, Calendar, Check, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tables } from "@/types";
import { resolveMembership } from "@/lib/membership";
import { supabase } from "@/integrations/supabase/client";

type UserData = Tables<"users">;

interface DiamondPlusPopupProps {
  userData: UserData;
}

type Offer = {
  id: string;
  title: string;
  description: string;
  price: string;
  route: string;
  perks: string[];
  totalPositions: number;
  installment?: { down: string; rest: string };
};

const buildOffer = (userData: UserData): Offer | null => {
  const u = userData as any;
  const membership = resolveMembership(u);
  const userType = String(u.user_type || "").toLowerCase();
  const isPerformer = userType === "stripper" || userType === "exotic";
  const isBusinessOwner = userType.includes("business");
  const isApproved = u.approval_status === "approved";

  // Approved performers -> Diamond Plus
  if (isPerformer && isApproved && !u.diamond_plus_active && membership.rank < 5) {
    return {
      id: "diamond_plus",
      title: "You've Been Approved!",
      description: "Congratulations! You are now eligible for Diamond Plus membership. One Time Fee! Lifetime Member!",
      price: "$149.99",
      route: "/upgrade-diamond",
      perks: ["No referral fees attached", "Full payment via PayPal", "Monthly plan More Expensive: $80 x 12 = $960"],
      totalPositions: 300,
    };
  }

  // Business owners -> Elite Plus
  if (isBusinessOwner && !u.business_owner_elite_active && membership.rank < 7) {
    return {
      id: "elite_plus",
      title: "Upgrade to Elite Plus",
      description: "Unlock full access to every area of the platform as an Elite Plus partner.",
      price: "$15,000",
      route: "/business-owner-elite",
      perks: ["Full site-wide access"],
      totalPositions: 100,
      installment: { down: "$1,500 first payment ($1,250 + $250 fees)", rest: "12 months of $1,250" },
    };
  }

  // Silver members -> Silver Plus
  if (!u.silver_plus_active && membership.rank <= 1) {
    return {
      id: "silver_plus",
      title: "Upgrade to Silver Plus",
      description: "Step up to Silver Plus and start earning profit sharing positions. One Time Fee $249.99",
      price: "$249.99",
      route: "/upgrade-silver-plus",
      perks: ["Profit sharing position"],
      totalPositions: 300,
      installment: {
        down: "$62.50 per month x 12 months",
        rest: "Total $750.00 monthly plan",
      },
    };
  }

  return null;
};

const DiamondPlusPopup: React.FC<DiamondPlusPopupProps> = ({ userData }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const offer = useMemo(() => buildOffer(userData), [userData]);

  const [positionsLeft, setPositionsLeft] = useState<number | null>(null);

  const notifyCleared = () =>
    window.dispatchEvent(new CustomEvent("dimes:popups-cleared"));

  useEffect(() => {
    const storageKey = offer ? `upgrade_popup_shown_${offer.id}` : null;
    if (!offer || (storageKey && sessionStorage.getItem(storageKey))) {
      notifyCleared();
      return;
    }
    setOpen(true);
    sessionStorage.setItem(storageKey as string, "true");
  }, [offer]);

  useEffect(() => {
    if (!offer) return;
    let cancelled = false;
    const load = async () => {
      try {
        if (offer.id === "silver_plus") {
          const { data } = await supabase.rpc("check_silver_plus_availability");
          const row = Array.isArray(data) ? (data[0] as any) : null;
          if (!cancelled && row) setPositionsLeft(Math.max(0, Number(row.remaining ?? 0)));
        } else if (offer.id === "diamond_plus") {
          const { data } = await supabase.rpc("get_diamond_plus_count");
          if (!cancelled && data !== null) {
            setPositionsLeft(Math.max(0, offer.totalPositions - Number(data)));
          }
        } else if (offer.id === "elite_plus") {
          const { data } = await (supabase as any).rpc("get_elite_plus_count");
          if (!cancelled && data !== null && data !== undefined) {
            setPositionsLeft(Math.max(0, offer.totalPositions - Number(data)));
          }
        }
      } catch (e) {
        console.error("positions left error", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [offer]);

  if (!offer) return null;

  const handleUpgrade = () => {
    setOpen(false);
    notifyCleared();
    navigate(offer.route);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) notifyCleared();
      }}
    >
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-400 text-black border-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-black">
            <Crown className="w-7 h-7" />
            {offer.title}
          </DialogTitle>
          <DialogDescription className="text-black/80 text-base">
            {offer.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-3xl font-bold">{offer.price}</div>
            <div className="rounded-lg bg-black/85 px-3 py-2 text-right">
              <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-yellow-300">
                <Users className="h-3.5 w-3.5" />
                Positions left
              </div>
              <div className="text-xl font-black text-white">
                {positionsLeft === null
                  ? "…"
                  : `${positionsLeft} of ${offer.totalPositions}`}
              </div>
            </div>
          </div>


          <div className="space-y-2 text-sm">
            {offer.perks.map((perk) => (
              <div key={perk} className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{perk}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>Secure checkout via PayPal</span>
            </div>

            {offer.installment && (
              <>
                <div className="font-medium">Installment option more expensive:</div>
                <div className="ml-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>$750.00</span>
                  </div>
                  <div className="ml-6 text-xs space-y-1">
                    <div>{offer.installment.down}</div>
                    <div>{offer.installment.rest}</div>
                  </div>
                </div>
              </>
            )}
          </div>

          <Button
            onClick={handleUpgrade}
            className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 text-lg shadow-md"
          >
            <Crown className="w-5 h-5 mr-2" />
            Upgrade Now
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
              notifyCleared();
            }}
            className="w-full text-black/70 hover:text-black hover:bg-black/10"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DiamondPlusPopup;
