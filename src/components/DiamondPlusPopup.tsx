import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, DollarSign, Calendar, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tables } from "@/types";
import { resolveMembership } from "@/lib/membership";

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
      description: "Congratulations! You are now eligible for Diamond Plus membership.",
      price: "$149.99",
      route: "/upgrade-diamond",
      perks: ["No referral fees attached", "Full payment via PayPal"],
      installment: { down: "$49.99 down payment", rest: "2 installments of $50.00" },
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
      perks: ["Only 100 positions available", "Full site-wide access"],
      installment: { down: "$1,500 first payment ($1,250 + $250 fees)", rest: "12 months of $1,250" },
    };
  }

  // Silver members -> Silver Plus
  if (!u.silver_plus_active && membership.rank <= 1) {
    return {
      id: "silver_plus",
      title: "Upgrade to Silver Plus",
      description: "Step up to Silver Plus and start earning profit sharing positions.",
      price: "$99.99",
      route: "/upgrade-silver-plus",
      perks: ["Profit sharing position", "Limited to 300 positions"],
    };
  }

  return null;
};

const DiamondPlusPopup: React.FC<DiamondPlusPopupProps> = ({ userData }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const offer = useMemo(() => buildOffer(userData), [userData]);

  useEffect(() => {
    if (!offer) return;
    const storageKey = `upgrade_popup_shown_${offer.id}`;
    if (sessionStorage.getItem(storageKey)) return;
    setOpen(true);
    sessionStorage.setItem(storageKey, "true");
  }, [offer]);

  if (!offer) return null;

  const handleUpgrade = () => {
    setOpen(false);
    navigate(offer.route);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <div className="text-3xl font-bold">{offer.price}</div>

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
                <div className="font-medium">Installment option:</div>
                <div className="ml-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{offer.price}</span>
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
            onClick={() => setOpen(false)}
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
