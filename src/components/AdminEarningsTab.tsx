import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  Search,
  DollarSign,
  TrendingUp,
  Calendar,
  Award,
  Users,
  CreditCard,
} from "lucide-react";

interface User {
  id: string;
  username: string;
  user_type: string;
  tips_earned: number;
  referral_fees: number;
  weekly_earnings: number;
}

interface DetailedEarningsData {
  // Current earnings summary
  totalEarnings: number;
  availableForWithdrawal: number;

  // Tips breakdown
  tipsReceived: {
    total: number;
    count: number;
    thisWeek: number;
    thisMonth: number;
  };

  // Referral earnings
  referralEarnings: {
    total: number;
    count: number;
    thisWeek: number;
    thisMonth: number;
  };

  // Event commissions
  eventCommissions: {
    total: number;
    count: number;
    thisWeek: number;
    thisMonth: number;
  };

  // Jackpot data
  jackpotData: {
    currentTickets: number;
    totalTickets: number;
    winnings: Array<{
      date: string;
      amount: number;
      draw_date: string;
    }>;
  };

  // Weekly breakdown
  weeklyEarnings: Array<{
    week_start: string;
    week_end: string;
    tip_earnings: number;
    referral_earnings: number;
    bonus_earnings: number;
    total: number;
  }>;

  // Commission payouts
  commissionPayouts: Array<{
    id: string;
    amount: number;
    commission_type: string;
    payout_status: string;
    created_at: string;
  }>;
}

const AdminEarningsTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [earnings, setEarnings] = useState<DetailedEarningsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "weekly" | "payouts">(
    "summary"
  );
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter((user) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, username, user_type, tips_earned, referral_fees, weekly_earnings"
        )
        .order("username");

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
  };

  const fetchUserEarnings = async (userId: string) => {
    setLoading(true);
    try {
      // Get date ranges for calculations
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch tips received by this user
      const { data: tipsReceived, error: tipsError } = await supabase
        .from("tips")
        .select("tip_amount, created_at, status")
        .eq("tipped_username", users.find((u) => u.id === userId)?.username)
        .eq("status", "completed");

      if (tipsError) throw tipsError;

      // Fetch referral commissions for this user
      const { data: referralCommissions, error: referralError } = await supabase
        .from("payments")
        .select("referrer_commission, created_at, referred_by")
        .eq("referred_by", users.find((u) => u.id === userId)?.username)
        .not("referrer_commission", "is", null);

      if (referralError) throw referralError;

      // Fetch event host commissions
      const { data: eventCommissions, error: eventError } = await supabase
        .from("payments")
        .select("event_host_commission, created_at, event_id")
        .eq("user_id", userId)
        .not("event_host_commission", "is", null);

      if (eventError) throw eventError;

      // Fetch jackpot tickets and winnings
      const { data: jackpotTickets, error: jackpotError } = await supabase
        .from("jackpot_tickets")
        .select("tickets_count, created_at, is_winner")
        .eq("user_id", userId);

      if (jackpotError) throw jackpotError;

      const { data: jackpotWinnings, error: winningsError } = await supabase
        .from("jackpot_winners")
        .select("amount_won, draw_date, created_at")
        .eq("user_id", userId);

      if (winningsError) throw winningsError;

      // Fetch weekly earnings breakdown
      const { data: weeklyEarnings, error: weeklyError } = await supabase
        .from("weekly_earnings")
        .select("*")
        .eq("user_id", userId)
        .order("week_start", { ascending: false })
        .limit(12); // Last 12 weeks

      if (weeklyError) throw weeklyError;

      // Fetch commission payouts
      const { data: commissionPayouts, error: payoutsError } = await supabase
        .from("commission_payouts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (payoutsError) throw payoutsError;

      // Calculate tips breakdown
      const tipsTotal = (tipsReceived || []).reduce(
        (sum, tip) => sum + tip.tip_amount,
        0
      );
      const tipsThisWeek = (tipsReceived || [])
        .filter((tip) => new Date(tip.created_at) >= weekStart)
        .reduce((sum, tip) => sum + tip.tip_amount, 0);
      const tipsThisMonth = (tipsReceived || [])
        .filter((tip) => new Date(tip.created_at) >= monthStart)
        .reduce((sum, tip) => sum + tip.tip_amount, 0);

      // Calculate referral earnings breakdown
      const referralTotal = (referralCommissions || []).reduce(
        (sum, commission) => sum + (commission.referrer_commission || 0),
        0
      );
      const referralThisWeek = (referralCommissions || [])
        .filter((commission) => new Date(commission.created_at) >= weekStart)
        .reduce(
          (sum, commission) => sum + (commission.referrer_commission || 0),
          0
        );
      const referralThisMonth = (referralCommissions || [])
        .filter((commission) => new Date(commission.created_at) >= monthStart)
        .reduce(
          (sum, commission) => sum + (commission.referrer_commission || 0),
          0
        );

      // Calculate event commissions breakdown
      const eventTotal = (eventCommissions || []).reduce(
        (sum, commission) => sum + (commission.event_host_commission || 0),
        0
      );
      const eventThisWeek = (eventCommissions || [])
        .filter((commission) => new Date(commission.created_at) >= weekStart)
        .reduce(
          (sum, commission) => sum + (commission.event_host_commission || 0),
          0
        );
      const eventThisMonth = (eventCommissions || [])
        .filter((commission) => new Date(commission.created_at) >= monthStart)
        .reduce(
          (sum, commission) => sum + (commission.event_host_commission || 0),
          0
        );

      // Calculate jackpot data
      const currentTickets = (jackpotTickets || [])
        .filter((ticket) => !ticket.is_winner)
        .reduce((sum, ticket) => sum + ticket.tickets_count, 0);
      const totalTickets = (jackpotTickets || []).reduce(
        (sum, ticket) => sum + ticket.tickets_count,
        0
      );

      // Calculate total earnings
      const totalEarnings = tipsTotal + referralTotal + eventTotal;
      const paidOut = (commissionPayouts || [])
        .filter((payout) => payout.payout_status === "completed")
        .reduce((sum, payout) => sum + payout.amount, 0);
      const availableForWithdrawal = totalEarnings - paidOut;

      const detailedEarnings: DetailedEarningsData = {
        totalEarnings,
        availableForWithdrawal,
        tipsReceived: {
          total: tipsTotal,
          count: (tipsReceived || []).length,
          thisWeek: tipsThisWeek,
          thisMonth: tipsThisMonth,
        },
        referralEarnings: {
          total: referralTotal,
          count: (referralCommissions || []).length,
          thisWeek: referralThisWeek,
          thisMonth: referralThisMonth,
        },
        eventCommissions: {
          total: eventTotal,
          count: (eventCommissions || []).length,
          thisWeek: eventThisWeek,
          thisMonth: eventThisMonth,
        },
        jackpotData: {
          currentTickets,
          totalTickets,
          winnings: (jackpotWinnings || []).map((win) => ({
            date: win.created_at,
            amount: win.amount_won,
            draw_date: win.draw_date,
          })),
        },
        weeklyEarnings: (weeklyEarnings || []).map((week) => ({
          week_start: week.week_start,
          week_end: week.week_end,
          tip_earnings: week.tip_earnings || 0,
          referral_earnings: week.referral_earnings || 0,
          bonus_earnings: week.bonus_earnings || 0,
          total: week.amount || 0,
        })),
        commissionPayouts: (commissionPayouts || []).map((payout) => ({
          id: payout.id,
          amount: payout.amount,
          commission_type: payout.commission_type,
          payout_status: payout.payout_status || "pending",
          created_at: payout.created_at,
        })),
      };

      setEarnings(detailedEarnings);
    } catch (error) {
      console.error("Error fetching earnings:", error);
      toast({
        title: "Error",
        description: "Failed to fetch earnings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const getStatusBadge = (status: string) => {
    const variants: {
      [key: string]: "default" | "secondary" | "destructive" | "outline";
    } = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
      processing: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            User Earnings Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={selectedUser}
              onValueChange={(value) => {
                setSelectedUser(value);
                if (value) fetchUserEarnings(value);
              }}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select a user to view earnings" />
              </SelectTrigger>
              <SelectContent>
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <span>{user.username}</span>
                      <Badge variant="outline" className="text-xs">
                        {user.user_type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading detailed earnings data...</p>
            </div>
          )}

          {earnings && !loading && (
            <div className="space-y-6">
              {/* Earnings Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-green-700">
                      Total Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-800">
                      {formatCurrency(earnings.totalEarnings)}
                    </div>
                    <p className="text-xs text-green-600">All time earnings</p>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-blue-700">
                      Available
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-800">
                      {formatCurrency(earnings.availableForWithdrawal)}
                    </div>
                    <p className="text-xs text-blue-600">For withdrawal</p>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-purple-700">
                      Tips Received
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-800">
                      {formatCurrency(earnings.tipsReceived.total)}
                    </div>
                    <p className="text-xs text-purple-600">
                      {earnings.tipsReceived.count} tips
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-orange-700">
                      Referral Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-800">
                      {formatCurrency(earnings.referralEarnings.total)}
                    </div>
                    <p className="text-xs text-orange-600">
                      {earnings.referralEarnings.count} referrals
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs for detailed view */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                <Button
                  variant={activeTab === "summary" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("summary")}
                >
                  Summary
                </Button>
                <Button
                  variant={activeTab === "weekly" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("weekly")}
                >
                  Weekly History
                </Button>
                <Button
                  variant={activeTab === "payouts" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("payouts")}
                >
                  Payouts
                </Button>
              </div>

              {/* Tab Content */}
              {activeTab === "summary" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Recent Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="text-sm font-medium">This Week</span>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(
                              earnings.tipsReceived.thisWeek +
                                earnings.referralEarnings.thisWeek +
                                earnings.eventCommissions.thisWeek
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Total earned
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="text-sm font-medium">This Month</span>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(
                              earnings.tipsReceived.thisMonth +
                                earnings.referralEarnings.thisMonth +
                                earnings.eventCommissions.thisMonth
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Total earned
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Jackpot Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Jackpot Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                        <span className="text-sm font-medium">
                          Current Tickets
                        </span>
                        <div className="text-right">
                          <div className="font-semibold text-yellow-700">
                            {earnings.jackpotData.currentTickets}
                          </div>
                          <div className="text-xs text-yellow-600">
                            Active tickets
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                        <span className="text-sm font-medium">
                          Total Winnings
                        </span>
                        <div className="text-right">
                          <div className="font-semibold text-yellow-700">
                            {formatCurrency(
                              earnings.jackpotData.winnings.reduce(
                                (sum, win) => sum + win.amount,
                                0
                              )
                            )}
                          </div>
                          <div className="text-xs text-yellow-600">
                            {earnings.jackpotData.winnings.length} wins
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "weekly" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Weekly Earnings History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {earnings.weeklyEarnings.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">
                          No weekly earnings data available
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {earnings.weeklyEarnings.map((week, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium">
                                  Week of{" "}
                                  {new Date(
                                    week.week_start
                                  ).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(
                                    week.week_start
                                  ).toLocaleDateString()}{" "}
                                  -{" "}
                                  {new Date(week.week_end).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold">
                                  {formatCurrency(week.total)}
                                </p>
                                <Badge variant="default">Total</Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Tips:</span>
                                <span className="ml-1 font-medium">
                                  {formatCurrency(week.tip_earnings)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">
                                  Referrals:
                                </span>
                                <span className="ml-1 font-medium">
                                  {formatCurrency(week.referral_earnings)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500">Bonus:</span>
                                <span className="ml-1 font-medium">
                                  {formatCurrency(week.bonus_earnings)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === "payouts" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Commission Payouts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {earnings.commissionPayouts.length === 0 ? (
                      <div className="text-center py-8">
                        <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">
                          No payout history available
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {earnings.commissionPayouts.map((payout) => (
                          <div
                            key={payout.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">
                                {formatCurrency(payout.amount)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {payout.commission_type} •{" "}
                                {new Date(
                                  payout.created_at
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(payout.payout_status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEarningsTab;
