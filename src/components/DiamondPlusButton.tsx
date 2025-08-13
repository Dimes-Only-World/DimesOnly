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
    userData.user_type === "stripper" || userData.user_type === "exotic";
  const alreadyDiamondPlus = userData.diamond_plus_active;

  // Calculate remaining spots (shared cap of 1000 across stripper + exotic)
  const totalCurrentCount = membershipLimits.reduce(
    (sum, limit) => sum + limit.current_count,
    0
  );
  const overallMaxCount = 1000; // shared cap - client requested 1000 total spots
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

      // Count actual diamond plus users (same as PositionCounter)
      const { count: diamondPlusCount, error: countError } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("diamond_plus_active", true)
        .in("user_type", ["exotic", "stripper"]);

      console.log("Diamond Plus user count result:", { diamondPlusCount, countError });

      if (countError) {
        console.error("Error fetching Diamond Plus user count:", countError);
        // Set default values if there's any error
        setMembershipLimits([
          {
            membership_type: "diamond_plus",
            user_type: "combined",
            current_count: 0,
            max_count: 1000,
          } as MembershipLimits,
        ]);
      } else {
        // Use actual count from database
        setMembershipLimits([
          {
            membership_type: "diamond_plus",
            user_type: "combined",
            current_count: diamondPlusCount || 0,
            max_count: 1000,
          } as MembershipLimits,
        ]);
      }
    } catch (error) {
      console.error("Error fetching Diamond Plus user count:", error);
      // Set default values if there's any error
      setMembershipLimits([
        {
          membership_type: "diamond_plus",
          user_type: "combined",
          current_count: 0,
          max_count: 1000,
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
    <Card className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black mb-6 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <Crown className="w-6 h-6" />
          DIAMOND PLUS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-3xl font-bold">$349.99</div>
          <div className="text-right">
            <div className="text-sm font-medium">
              Only {Math.max(0, spotsLeft)} spots left!
            </div>
            <div className="text-xs opacity-80">No referral fees attached</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">
              PayPal button complete upgrades status
            </span>
          </div>
          <div className="text-sm font-medium">Installment option:</div>
          <div className="ml-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>$149.00</span>
            </div>
            <div className="ml-6 text-xs space-y-1">
              <div>2 installments include $11.73 installment fee</div>
              <div>$111.73 per installment</div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleUpgrade}
          className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 text-lg shadow-md"
        >
          <Crown className="w-5 h-5 mr-2" />
          DIAMOND PLUS
        </Button>

        <div className="text-xs text-center opacity-80">
          When transaction is complete, update to Diamond Plus
        </div>
      </CardContent>
    </Card>
  );
};

export default DiamondPlusButton;
