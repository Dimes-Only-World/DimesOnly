import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, DollarSign, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tables } from "@/types";

type UserData = Tables<"users">;

interface DiamondPlusPopupProps {
  userData: UserData;
}

const DiamondPlusPopup: React.FC<DiamondPlusPopupProps> = ({ userData }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const isPerformer =
      userData.user_type === "stripper" || userData.user_type === "exotic";
    const isApproved = (userData as any).approval_status === "approved";
    const notYetDiamond = !userData.diamond_plus_active;
    const alreadyShown = sessionStorage.getItem("diamond_plus_popup_shown");

    if (isPerformer && isApproved && notYetDiamond && !alreadyShown) {
      setOpen(true);
      sessionStorage.setItem("diamond_plus_popup_shown", "true");
    }
  }, [userData]);

  const handleUpgrade = () => {
    setOpen(false);
    navigate("/upgrade-diamond");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-400 text-black border-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-black">
            <Crown className="w-7 h-7" />
            You've Been Approved!
          </DialogTitle>
          <DialogDescription className="text-black/80 text-base">
            Congratulations! You are now eligible for Diamond Plus membership.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">$149.99</div>
            <div className="text-right text-sm opacity-80">
              No referral fees attached
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>Full payment via PayPal</span>
            </div>
            <div className="font-medium">Installment option:</div>
            <div className="ml-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>$149.99</span>
              </div>
              <div className="ml-6 text-xs space-y-1">
                <div>$49.99 down payment</div>
                <div>2 installments of $50.00</div>
              </div>
            </div>
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
