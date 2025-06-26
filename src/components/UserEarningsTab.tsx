import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, CreditCard, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import PaymentStatus from "@/components/PaymentStatus";
import JackpotBreakdown from "@/components/JackpotBreakdown";

interface WeeklyEarning {
  id: string;
  week_start: string;
  amount: number;
  created_at: string;
}

interface UserEarningsTabProps {
  userData: {
    id: string;
    user_type?: string;
    tips_earned?: number;
    referral_fees?: number;
    weekly_earnings?: number;
    username?: string;
  };
}

const UserEarningsTab: React.FC<UserEarningsTabProps> = ({ userData }) => {
  const [weeklyEarnings, setWeeklyEarnings] = useState<WeeklyEarning[]>([]);
  const [currentEarnings, setCurrentEarnings] = useState(0);
  const [totalYearlyEarnings, setTotalYearlyEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const { toast } = useToast();
  const { user } = useAppContext();

  // Mock data for payment program tracking
  const [paymentData] = useState({
    weeklyProgress: {
      referrals: 3,
      photos: 5,
      videos: 2,
      messages: 7,
    },
    monthlyProgress: {
      events: 0,
    },
    quarterlyProgress: {
      totalReferrals: 15,
      totalPhotos: 25,
      totalVideos: 18,
      totalMessages: 42,
      totalEvents: 1,
    },
    deductions: {
      weekly: 168.56,
      monthly: 500,
      total: 668.56,
    },
  });

  useEffect(() => {
    if (userData?.id) {
      fetchEarningsData();
    }
  }, [userData?.id]);

  const fetchEarningsData = async () => {
    if (!userData?.id) {
      setLoading(false);
      return;
    }

    try {
      // Fetch weekly earnings
      const { data: weeklyData, error: weeklyError } = await supabase
        .from("weekly_earnings")
        .select("*")
        .eq("user_id", userData.id)
        .order("week_start", { ascending: false });

      if (weeklyError) throw weeklyError;
      setWeeklyEarnings((weeklyData as unknown as WeeklyEarning[]) || []);

      // Calculate current earnings
      const currentAmount = (
        (weeklyData as unknown as WeeklyEarning[]) || []
      ).reduce((sum, earning) => {
        return sum + (earning.amount || 0);
      }, 0);
      setCurrentEarnings(currentAmount);

      // Calculate yearly earnings
      const currentYear = new Date().getFullYear();
      const yearlyAmount = (
        (weeklyData as unknown as WeeklyEarning[]) || []
      ).reduce((sum, earning) => {
        const earningYear = new Date(earning.week_start).getFullYear();
        return earningYear === currentYear ? sum + (earning.amount || 0) : sum;
      }, 0);
      setTotalYearlyEarnings(yearlyAmount);
    } catch (error) {
      console.error("Error fetching earnings:", error);
      toast({
        title: "Error",
        description: "Failed to load earnings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getNextPayoutDate = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDate = now.getDate();

    let nextPayout;
    if (currentDate <= 1) {
      nextPayout = new Date(currentYear, currentMonth, 1);
    } else if (currentDate <= 15) {
      nextPayout = new Date(currentYear, currentMonth, 15);
    } else {
      nextPayout = new Date(currentYear, currentMonth + 1, 1);
    }

    return nextPayout.toLocaleDateString();
  };

  const handlePayoutRequest = () => {
    if (currentEarnings === 0) {
      toast({
        title: "No Earnings",
        description: "You have no earnings available for withdrawal",
        variant: "destructive",
      });
      return;
    }
    setShowPayoutForm(true);
  };

  const isEligibleForPaymentProgram = () => {
    const userType = userData?.user_type?.toLowerCase();
    return userType === "stripper" || userType === "exotic";
  };

  if (!userData) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">Please log in to view earnings</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quarterly Payment Program - Only for Strippers and Exotic Dancers */}
      {isEligibleForPaymentProgram() && (
        <PaymentStatus
          userType={userData.user_type || ""}
          weeklyProgress={paymentData.weeklyProgress}
          monthlyProgress={paymentData.monthlyProgress}
          quarterlyProgress={paymentData.quarterlyProgress}
          deductions={paymentData.deductions}
        />
      )}

      {/* Jackpot Information */}
      <JackpotBreakdown />

      {/* Current Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Current Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${currentEarnings.toFixed(2)}
            </div>
            <p className="text-sm text-gray-500">Available for withdrawal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Yearly Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalYearlyEarnings.toFixed(2)}
            </div>
            <p className="text-sm text-gray-500">
              {new Date().getFullYear()} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Next Payout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getNextPayoutDate()}</div>
            <p className="text-sm text-gray-500">1st & 15th of each month</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Earnings History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Earnings History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyEarnings.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No earnings history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weeklyEarnings.map((earning) => (
                <div
                  key={earning.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      Week of{" "}
                      {new Date(earning.week_start).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">Weekly earnings</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${(earning.amount || 0).toFixed(2)}
                    </p>
                    <Badge variant="default">Available</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserEarningsTab;
