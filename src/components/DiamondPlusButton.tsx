import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, DollarSign, Calendar, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/types";

type UserData = Tables<"users">;

interface MembershipLimits {
  membership_type: string;
  user_type: string;
  current_count: number;
  max_count: number;
}

interface DiamondPlusButtonProps {
  userData: UserData;
}

const DiamondPlusButton: React.FC<DiamondPlusButtonProps> = ({ userData }) => {
  const { toast } = useToast();
  const [membershipLimits, setMembershipLimits] = useState<MembershipLimits[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  // Check if user is eligible for Diamond Plus
  const isEligible =
    (userData.user_type === "stripper" || userData.user_type === "exotic") &&
    (userData as any).approval_status === "approved";
  const alreadyDiamondPlus = userData.diamond_plus_active;

  // Calculate remaining spots (shared cap of 1000 across stripper + exotic)
  const totalCurrentCount = membershipLimits.reduce(
    (sum, limit) => sum + limit.current_count,
    0
  );
  const overallMaxCount = 300; // shared cap - client requested 300 total spots
  const spotsLeft = overallMaxCount - totalCurrentCount;

  // Debug logging
  useEffect(() => {
    if (membershipLimits.length > 0) {
      console.log("Membership limits:", membershipLimits);
      console.log("Total max count:", overallMaxCount);
      console.log("Total current count:", totalCurrentCount);
      console.log("Spots left:", spotsLeft);
    }
  }, [membershipLimits, overallMaxCount, totalCurrentCount, spotsLeft]);

  useEffect(() => {
    if (isEligible && !alreadyDiamondPlus) {
      fetchMembershipLimits();
    }
  }, [isEligible, alreadyDiamondPlus]);

  const fetchMembershipLimits = async () => {
    try {
      console.log("Fetching actual Diamond Plus user count...");

      // Use RPC function to bypass RLS restrictions
      const { data: diamondPlusCount, error: countError } = await supabase.rpc("get_diamond_plus_count");

      console.log("Diamond Plus user count result:", { diamondPlusCount, countError });

      if (countError) {
        console.error("Error fetching Diamond Plus user count:", countError);
        setMembershipLimits([
          {
            membership_type: "diamond_plus",
            user_type: "combined",
            current_count: 0,
            max_count: 300,
          } as MembershipLimits,
        ]);
      } else {
        setMembershipLimits([
          {
            membership_type: "diamond_plus",
            user_type: "combined",
            current_count: diamondPlusCount || 0,
            max_count: 300,
          } as MembershipLimits,
        ]);
      }
    } catch (error) {
      console.error("Error fetching Diamond Plus user count:", error);
      setMembershipLimits([
        {
          membership_type: "diamond_plus",
          user_type: "combined",
          current_count: 0,
          max_count: 300,
        } as MembershipLimits,
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    window.location.href = "/upgrade-diamond";
  };

  // Don't show if user is not eligible or already has Diamond Plus
  if (!isEligible || alreadyDiamondPlus) {
    return null;
  }

  // Don't show if no spots left
  if (spotsLeft <= 0) {
    return null;
  }

  if (loading) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden border-0 mb-6 shadow-2xl bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Decorative glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-fuchsia-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg">
              <Crown className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Approved · Invitation Unlocked
              </div>
              <CardTitle className="text-2xl md:text-3xl font-black bg-gradient-to-r from-amber-200 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent mt-1">
                Diamond Plus Membership
              </CardTitle>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-widest text-white/60">Seats Remaining</div>
            <div className="text-2xl font-bold text-white">
              {Math.max(0, spotsLeft)}<span className="text-white/40 text-base"> / 300</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-5 pt-0">
        <p className="text-white/80 text-sm md:text-base leading-relaxed max-w-2xl">
          You've been personally approved as a top-tier Dime. Diamond Plus unlocks priority ranking,
          exclusive earning tiers, and a permanent seat among the platform's elite. Only 300 members
          worldwide will ever hold this position.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-widest text-amber-300/80">One-Time</div>
            <div className="text-xl font-bold text-white mt-1">$149.99</div>
            <div className="text-[11px] text-white/60">Lifetime seat</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-widest text-amber-300/80">Installments</div>
            <div className="text-xl font-bold text-white mt-1">$49.99<span className="text-sm text-white/60"> down</span></div>
            <div className="text-[11px] text-white/60">+ 2 × $50.00</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-widest text-amber-300/80">Referral Fees</div>
            <div className="text-xl font-bold text-white mt-1">$0</div>
            <div className="text-[11px] text-white/60">Keep 100%</div>
          </div>
        </div>

        <Button
          onClick={handleUpgrade}
          className="w-full h-14 text-base md:text-lg font-bold bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-black shadow-xl shadow-amber-500/30 transition-transform hover:scale-[1.01]"
        >
          <Crown className="w-5 h-5 mr-2" />
          Claim Your Diamond Plus Seat
          <DollarSign className="w-5 h-5 ml-2" />
        </Button>

        <div className="flex items-center justify-center gap-2 text-[11px] text-white/50">
          <AlertCircle className="w-3 h-3" />
          <span>Secure PayPal checkout · Membership activates instantly on payment</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DiamondPlusButton;
