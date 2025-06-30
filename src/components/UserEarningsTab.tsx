import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Calendar,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Award,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import PaymentStatus from "@/components/PaymentStatus";
import JackpotBreakdown from "@/components/JackpotBreakdown";

interface WeeklyEarning {
  id: string;
  week_start: string;
  week_end: string;
  amount: number;
  tip_earnings: number;
  referral_earnings: number;
  bonus_earnings: number;
  created_at: string;
}

interface TipData {
  id: string;
  tip_amount: number;
  tipper_username: string;
  created_at: string;
  status: string;
  referrer_username: string | null;
}

interface ReferralCommission {
  id: string;
  amount: number;
  referrer_commission: number;
  payment_type: string;
  created_at: string;
  referred_by: string;
}

interface JackpotData {
  currentTickets: number;
  totalTickets: number;
  winnings: Array<{
    amount_won: number;
    draw_date: string;
    created_at: string;
  }>;
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
  const [tipsReceived, setTipsReceived] = useState<TipData[]>([]);
  const [referralCommissions, setReferralCommissions] = useState<
    ReferralCommission[]
  >([]);
  const [jackpotData, setJackpotData] = useState<JackpotData>({
    currentTickets: 0,
    totalTickets: 0,
    winnings: [],
  });
  const [currentEarnings, setCurrentEarnings] = useState(0);
  const [totalYearlyEarnings, setTotalYearlyEarnings] = useState(0);
  const [availableForWithdrawal, setAvailableForWithdrawal] = useState(0);
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
      fetchAllEarningsData();
    }
  }, [userData?.id]);

  const fetchAllEarningsData = async () => {
    if (!userData?.id || !userData?.username) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all data in parallel for better performance
      const [
        weeklyResult,
        tipsResult,
        referralResult,
        jackpotTicketsResult,
        jackpotWinningsResult,
        payoutsResult,
      ] = await Promise.all([
        // Weekly earnings
        supabase
          .from("weekly_earnings")
          .select("*")
          .eq("user_id", userData.id)
          .order("week_start", { ascending: false }),

        // Tips received by this user
        supabase
          .from("tips")
          .select("*")
          .eq("tipped_username", userData.username)
          .eq("status", "completed")
          .order("created_at", { ascending: false }),

        // Referral commissions earned by this user
        supabase
          .from("payments")
          .select("*")
          .eq("referred_by", userData.username)
          .not("referrer_commission", "is", null)
          .order("created_at", { ascending: false }),

        // Jackpot tickets
        supabase.from("jackpot_tickets").select("*").eq("user_id", userData.id),

        // Jackpot winnings
        supabase
          .from("jackpot_winners")
          .select("*")
          .eq("user_id", userData.id)
          .order("draw_date", { ascending: false }),

        // Commission payouts to calculate available balance
        supabase
          .from("commission_payouts")
          .select("*")
          .eq("user_id", userData.id)
          .eq("payout_status", "completed"),
      ]);

      // Handle errors
      if (weeklyResult.error) throw weeklyResult.error;
      if (tipsResult.error) throw tipsResult.error;
      if (referralResult.error) throw referralResult.error;
      if (jackpotTicketsResult.error) throw jackpotTicketsResult.error;
      if (jackpotWinningsResult.error) throw jackpotWinningsResult.error;
      if (payoutsResult.error) throw payoutsResult.error;

      // Set the data with proper typing
      setWeeklyEarnings(
        (weeklyResult.data as unknown as WeeklyEarning[]) || []
      );
      setTipsReceived((tipsResult.data as unknown as TipData[]) || []);
      setReferralCommissions(
        (referralResult.data as unknown as ReferralCommission[]) || []
      );

      // Calculate jackpot data
      const tickets = (jackpotTicketsResult.data as unknown as any[]) || [];
      const winnings = (jackpotWinningsResult.data as unknown as any[]) || [];
      const currentTickets = tickets
        .filter((ticket) => !ticket.is_winner)
        .reduce((sum, ticket) => sum + (ticket.tickets_count || 0), 0);
      const totalTickets = tickets.reduce(
        (sum, ticket) => sum + (ticket.tickets_count || 0),
        0
      );

      setJackpotData({
        currentTickets,
        totalTickets,
        winnings: winnings.map((win) => ({
          amount_won: Number(win.amount_won || 0),
          draw_date: String(win.draw_date || ""),
          created_at: String(win.created_at || ""),
        })),
      });

      // Calculate earnings
      const tipsTotal = (
        (tipsResult.data as unknown as TipData[]) || []
      ).reduce((sum, tip) => sum + (tip.tip_amount || 0), 0);
      const referralTotal = (
        (referralResult.data as unknown as ReferralCommission[]) || []
      ).reduce((sum, payment) => sum + (payment.referrer_commission || 0), 0);
      const weeklyTotal = (
        (weeklyResult.data as unknown as WeeklyEarning[]) || []
      ).reduce((sum, earning) => sum + (earning.amount || 0), 0);
      const totalEarnings = Math.max(tipsTotal + referralTotal, weeklyTotal);

      // Calculate paid out amount
      const paidOut = ((payoutsResult.data as unknown as any[]) || []).reduce(
        (sum, payout) => sum + (Number(payout.amount) || 0),
        0
      );
      const available = Math.max(0, totalEarnings - paidOut);

      setCurrentEarnings(totalEarnings);
      setAvailableForWithdrawal(available);

      // Calculate yearly earnings
      const currentYear = new Date().getFullYear();
      const yearlyAmount = (
        (weeklyResult.data as unknown as WeeklyEarning[]) || []
      ).reduce((sum, earning) => {
        const earningYear = new Date(String(earning.week_start)).getFullYear();
        return earningYear === currentYear
          ? sum + (Number(earning.amount) || 0)
          : sum;
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
    if (availableForWithdrawal === 0) {
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

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const getRecentEarnings = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentTips = tipsReceived.filter(
      (tip) => new Date(tip.created_at) >= cutoffDate
    );
    const recentReferrals = referralCommissions.filter(
      (ref) => new Date(ref.created_at) >= cutoffDate
    );

    const tipsAmount = recentTips.reduce((sum, tip) => sum + tip.tip_amount, 0);
    const referralAmount = recentReferrals.reduce(
      (sum, ref) => sum + (ref.referrer_commission || 0),
      0
    );

    return tipsAmount + referralAmount;
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
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700">
              Available Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">
              {formatCurrency(availableForWithdrawal)}
            </div>
            <p className="text-sm text-green-600">Available for withdrawal</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700">
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {formatCurrency(currentEarnings)}
            </div>
            <p className="text-sm text-blue-600">All time total</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700">
              Next Payout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800">
              {getNextPayoutDate()}
            </div>
            <p className="text-sm text-purple-600">1st & 15th of each month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Last 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatCurrency(getRecentEarnings(7))}
            </div>
            <p className="text-xs text-gray-500">Recent earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4" />
              Jackpot Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {jackpotData.currentTickets}
            </div>
            <p className="text-xs text-gray-500">Active tickets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {referralCommissions.length}
            </div>
            <p className="text-xs text-gray-500">Total referrals</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Earnings Tabs */}
      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="weekly">Weekly History</TabsTrigger>
          <TabsTrigger value="tips">Tips Received</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="jackpot">Jackpot</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4">
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
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          Week of{" "}
                          {new Date(earning.week_start).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(earning.week_start).toLocaleDateString()} -{" "}
                          {new Date(earning.week_end).toLocaleDateString()}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-600">
                          <span>
                            Tips: {formatCurrency(earning.tip_earnings || 0)}
                          </span>
                          <span>
                            Referrals:{" "}
                            {formatCurrency(earning.referral_earnings || 0)}
                          </span>
                          <span>
                            Bonus: {formatCurrency(earning.bonus_earnings || 0)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {formatCurrency(earning.amount || 0)}
                        </p>
                        <Badge variant="default">Total</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Tips Received ({tipsReceived.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tipsReceived.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No tips received yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tipsReceived.slice(0, 10).map((tip) => (
                    <div
                      key={tip.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          From {tip.tipper_username}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(tip.created_at).toLocaleDateString()}
                          {tip.referrer_username && (
                            <span className="ml-2 text-blue-600">
                              • Referred by {tip.referrer_username}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {formatCurrency(tip.tip_amount)}
                        </p>
                        <Badge variant="outline">{tip.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {tipsReceived.length > 10 && (
                    <p className="text-center text-sm text-gray-500 py-2">
                      Showing 10 of {tipsReceived.length} tips
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Referral Commissions ({referralCommissions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {referralCommissions.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No referral commissions yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Start referring users to earn commissions!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referralCommissions.slice(0, 10).map((commission) => (
                    <div
                      key={commission.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {commission.payment_type} Commission
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(commission.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">
                          {formatCurrency(commission.referrer_commission || 0)}
                        </p>
                        <Badge variant="outline">Commission</Badge>
                      </div>
                    </div>
                  ))}
                  {referralCommissions.length > 10 && (
                    <p className="text-center text-sm text-gray-500 py-2">
                      Showing 10 of {referralCommissions.length} commissions
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jackpot" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Jackpot Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-700">
                    {jackpotData.currentTickets}
                  </div>
                  <p className="text-sm text-yellow-600">Active Tickets</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-700">
                    {jackpotData.totalTickets}
                  </div>
                  <p className="text-sm text-yellow-600">Total Tickets</p>
                </div>
              </div>

              {jackpotData.winnings.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Jackpot Winnings</h4>
                  <div className="space-y-2">
                    {jackpotData.winnings.map((winning, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-green-800">
                            Jackpot Win!
                          </p>
                          <p className="text-sm text-green-600">
                            Draw:{" "}
                            {new Date(winning.draw_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-700">
                            {formatCurrency(winning.amount_won)}
                          </p>
                          <Badge variant="default" className="bg-green-600">
                            Winner
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {jackpotData.winnings.length === 0 && (
                <div className="text-center py-6">
                  <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No jackpot winnings yet</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Keep earning tips to get more tickets!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payout Request Button */}
      {availableForWithdrawal > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Ready for Payout</h3>
                <p className="text-sm text-gray-500">
                  You have {formatCurrency(availableForWithdrawal)} available
                  for withdrawal
                </p>
              </div>
              <Button
                onClick={handlePayoutRequest}
                className="bg-green-600 hover:bg-green-700"
              >
                Request Payout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserEarningsTab;
