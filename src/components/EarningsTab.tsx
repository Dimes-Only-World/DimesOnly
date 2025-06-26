import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, DollarSign, Ticket, TrendingUp } from "lucide-react";
import { Tables } from "@/types";
import { supabaseAdmin } from "@/lib/supabase";

type UserData = Tables<"users">;

interface EarningsData {
  totalEarnings: number;
  weeklyEarnings: number;
  totalTips: number;
  ticketsOwned: number;
  jackpotAmount: number;
  recentTips: Array<{
    from: string;
    amount: number;
    date: string;
    tickets: number;
  }>;
}

interface EarningsTabProps {
  userData: UserData;
}

const EarningsTab: React.FC<EarningsTabProps> = ({ userData }) => {
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 0,
    weeklyEarnings: 0,
    totalTips: 0,
    ticketsOwned: 0,
    jackpotAmount: 0,
    recentTips: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarningsData();
  }, [userData.id]);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);

      // Fetch tips data
      const { data: tipsData } = await supabaseAdmin
        .from("tips")
        .select("*")
        .eq("user_id", userData.id)
        .order("created_at", { ascending: false });

      // Fetch tickets data
      const { data: ticketsData } = await supabaseAdmin
        .from("tickets")
        .select("*")
        .eq("user_Id", userData.id);

      // Fetch current jackpot
      const { data: jackpotData } = await supabaseAdmin
        .from("jackpot")
        .select("current_amount")
        .eq("status", "active")
        .single();

      // Calculate earnings
      const totalTips =
        tipsData?.reduce((sum, tip) => sum + tip.tip_amount, 0) || 0;
      const weeklyTips = calculateWeeklyEarnings(tipsData || []);
      const recentTips = (tipsData || []).slice(0, 10).map((tip) => ({
        from: tip.tipper_username,
        amount: tip.tip_amount,
        date: tip.created_at || "",
        tickets: tip.tickets_generated,
      }));

      setEarnings({
        totalEarnings:
          (userData.tips_earned || 0) + (userData.referral_fees || 0),
        weeklyEarnings: userData.weekly_earnings || weeklyTips,
        totalTips: tipsData?.length || 0,
        ticketsOwned: userData.lottery_tickets || ticketsData?.length || 0,
        jackpotAmount: jackpotData?.current_amount || 0,
        recentTips,
      });
    } catch (error) {
      console.error("Error fetching earnings data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeeklyEarnings = (
    tips: Array<{ created_at: string; tip_amount: number }>
  ) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return tips
      .filter((tip) => new Date(tip.created_at) >= oneWeekAgo)
      .reduce((sum, tip) => sum + tip.tip_amount, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">
                  Total Earnings
                </p>
                <p className="text-2xl font-bold text-green-800">
                  {formatCurrency(earnings.totalEarnings)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">
                  Weekly Earnings
                </p>
                <p className="text-2xl font-bold text-blue-800">
                  {formatCurrency(earnings.weeklyEarnings)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">
                  Lottery Tickets
                </p>
                <p className="text-2xl font-bold text-purple-800">
                  {earnings.ticketsOwned}
                </p>
              </div>
              <Ticket className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">
                  Current Jackpot
                </p>
                <p className="text-2xl font-bold text-yellow-800">
                  {formatCurrency(earnings.jackpotAmount)}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Earnings Breakdown */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Earnings Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-green-600 font-medium">Tips Earned</p>
              <p className="text-2xl font-bold text-green-800">
                {formatCurrency(userData.tips_earned || 0)}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-600 font-medium">Referral Fees</p>
              <p className="text-2xl font-bold text-blue-800">
                {formatCurrency(userData.referral_fees || 0)}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-purple-600 font-medium">Overrides</p>
              <p className="text-2xl font-bold text-purple-800">
                {formatCurrency(userData.overrides || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Tips */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Recent Tips Received
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.recentTips.length > 0 ? (
            <div className="space-y-3">
              {earnings.recentTips.map((tip, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {tip.from.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tip.from}</p>
                      <p className="text-gray-500 text-sm">
                        {new Date(tip.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-600 font-bold">
                      {formatCurrency(tip.amount)}
                    </p>
                    <Badge className="bg-purple-100 text-purple-800 text-xs">
                      {tip.tickets} tickets
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No tips received yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jackpot Info */}
      {earnings.jackpotAmount > 0 && (
        <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-yellow-700 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Jackpot Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600 mb-2">
                  {formatCurrency(earnings.jackpotAmount)}
                </p>
                <p className="text-yellow-700">Current Weekly Jackpot</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <p className="text-yellow-700 font-semibold">Grand Prize</p>
                  <p className="text-gray-900 text-lg">
                    {formatCurrency(earnings.jackpotAmount * 0.25)}
                  </p>
                  <p className="text-yellow-600 text-sm">25% of jackpot</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <p className="text-yellow-700 font-semibold">2nd Place</p>
                  <p className="text-gray-900 text-lg">
                    {formatCurrency(earnings.jackpotAmount * 0.03)}
                  </p>
                  <p className="text-yellow-600 text-sm">3% of jackpot</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <p className="text-yellow-700 font-semibold">3rd Place</p>
                  <p className="text-gray-900 text-lg">
                    {formatCurrency(earnings.jackpotAmount * 0.02)}
                  </p>
                  <p className="text-yellow-600 text-sm">2% of jackpot</p>
                </div>
              </div>

              <div className="text-center text-yellow-700 text-sm">
                <p>
                  Your tickets:{" "}
                  <span className="font-bold">{earnings.ticketsOwned}</span>
                </p>
                <p>Drawing every Friday when jackpot reaches $1,000+</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EarningsTab;
