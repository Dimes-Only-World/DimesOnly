import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Star, Users, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types";

type UserData = Tables<"users">;

interface SilverPlusMembershipProps {
  userData: UserData;
  onMembershipUpdate?: (updatedData: Partial<UserData>) => void;
}

const SilverPlusMembership: React.FC<SilverPlusMembershipProps> = ({
  userData,
  onMembershipUpdate,
}) => {
  const [silverPlusInfo, setSilverPlusInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    current_count: number;
    max_count: number;
    remaining: number;
  } | null>(null);
  const { toast } = useToast();

  // Fetch the current availability
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const { data, error } = await supabase
          .rpc('check_silver_plus_availability');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const counterInfo = data[0];
          setAvailability({
            available: counterInfo.available,
            current_count: counterInfo.current_count,
            max_count: counterInfo.max_count,
            remaining: counterInfo.remaining
          });
        }
      } catch (error) {
        console.error("Error fetching Silver+ availability:", error);
      }
    };

    fetchAvailability();
  }, []);

  // Check if user is eligible for Silver Plus (males and normal females)
  const isEligible = userData.gender === "male" || 
    (userData.gender === "female" && (userData.user_type === "normal" || userData.userType === "normal"));

  // Check if user already has Silver Plus
  const hasSilverPlus = userData.silver_plus_active === true;

  useEffect(() => {
    if (isEligible) {
      fetchSilverPlusInfo();
    }
  }, [userData.id, isEligible]);

  const fetchSilverPlusInfo = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_silver_plus_membership_info', {
          user_id_param: userData.id
        });

      if (error) {
        console.error("Error fetching Silver Plus info:", error);
        return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        setSilverPlusInfo(data[0]);
      }
    } catch (error) {
      console.error("Error fetching Silver Plus info:", error);
    }
  };

  const handleGetSilverPlus = async () => {
    setLoading(true);
    try {
      // Check availability first
      const { data: availability, error: availabilityError } = await supabase
        .rpc('check_silver_plus_availability');

      if (availabilityError) {
        throw new Error("Failed to check availability");
      }

      if (availability && Array.isArray(availability) && availability.length > 0 && !availability[0].available) {
        toast({
          title: "Silver Plus Unavailable",
          description: "All 3,000 Silver Plus memberships have been claimed. It will become an annual subscription soon.",
          variant: "destructive",
        });
        return;
      }

      // Redirect to Silver Plus purchase page
      window.location.href = `/upgrade-silver-plus?user_id=${userData.id}`;
    } catch (error) {
      console.error("Error checking Silver Plus availability:", error);
      toast({
        title: "Error",
        description: "Failed to check Silver Plus availability",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isEligible) {
    return null; // Don't show for strippers/exotics
  }

  if (hasSilverPlus) {
    return (
      <Card className="bg-gradient-to-r from-slate-100 to-slate-200 border-slate-300">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="w-6 h-6 text-slate-600" />
            <CardTitle className="text-slate-800">Silver Plus Member</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-slate-600 text-white">
            Member #{userData.silver_plus_membership_number || 'N/A'}
          </Badge>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-slate-700 mb-4">
            You are a lifetime Silver Plus member! Enjoy exclusive benefits and features.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-slate-600" />
              <span>Premium Access</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" />
              <span>Exclusive Content</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-600" />
              <span>Priority Support</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Crown className="w-6 h-6 text-blue-600" />
          <CardTitle className="text-blue-800">Get Silver Plus Membership</CardTitle>
        </div>
        <Badge variant="secondary" className="bg-blue-600 text-white">
          Limited Time: Only {availability?.remaining.toLocaleString() || '3,000'} Available
        </Badge>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-blue-700 mb-4">
          Join the exclusive Silver Plus membership for a one-time fee and unlock premium features for life!
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-blue-600" />
            <span>Lifetime Access</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Exclusive Content</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span>Priority Support</span>
          </div>
        </div>

        <Button
          onClick={handleGetSilverPlus}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-8 py-3 text-lg shadow-lg"
        >
          {loading ? "Checking Availability..." : "Get Silver Plus Membership"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SilverPlusMembership; 