import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Search, TrendingUp, Users, Calendar } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  username: string;
  user_type: string;
  tips_earned: number;
  referral_fees: number;
  weekly_earnings: number;
}

interface DetailedEarningsData {
  totalEarnings: number;
  availableForWithdrawal: number;
  tipsReceived: {
    total: number;
    count: number;
    thisWeek: number;
    thisMonth: number;
  };
  referralEarnings: {
    total: number;
    count: number;
    thisWeek: number;
    thisMonth: number;
  };
  eventCommissions: {
    total: number;
    count: number;
    thisWeek: number;
    thisMonth: number;
  };
  jackpotData: {
    currentTickets: number;
    totalTickets: number;
    winnings: Array<{
      date: string;
      amount: number;
      draw_date: string;
    }>;
  };
  weeklyEarnings: Array<{
    week_start: string;
    week_end: string;
    tip_earnings: number;
    referral_earnings: number;
    bonus_earnings: number;
    total: number;
  }>;
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
  const [activeTab, setActiveTab] = useState<"summary" | "weekly" | "payouts">("summary");
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
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("id, username, user_type, tips_earned, referral_fees, weekly_earnings")
        .order("username");

      if (error) throw error;
      
      const typedData = (data || []).map(user => ({
        id: String(user.id),
        username: String(user.username),
        user_type: String(user.user_type),
        tips_earned: Number(user.tips_earned) || 0,
        referral_fees: Number(user.referral_fees) || 0,
        weekly_earnings: Number(user.weekly_earnings) || 0
      }));
      
      setUsers(typedData);
      setFilteredUsers(typedData);
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
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const selectedUser = users.find((u) => u.id === userId);

      console.log("=== ADMIN EARNINGS DEBUG ===");
      console.log("Selected User:", { userId, username: selectedUser?.username });

      // 1. Fetch tips received by this user
      const { data: tipsReceived, error: tipsError } = await supabaseAdmin
        .from("tips")
        .select("tip_amount, created_at, status")
        .eq("tipped_username", selectedUser?.username)
        .eq("status", "completed");

      if (tipsError) throw tipsError;

      console.log("Tips Data:", {
        tipsReceived,
        tipsCount: tipsReceived?.length || 0
      });

      // 2. Fetch referral commissions - EXACT SAME AS UserEarningsTab
      console.log("🔍 QUERYING REFERRAL COMMISSIONS FOR:", selectedUser?.username);
      
      // Use ONLY the UserEarningsTab query (not user_id query)
      const referralResult = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("referred_by", selectedUser?.username)
        .not("referrer_commission", "is", null)
        .order("created_at", { ascending: false });
      
      const referralCommissions = referralResult.data;
      console.log("🔍 REFERRAL QUERY RESULT:", { referralCommissions, error: referralResult.error });

      if (referralResult.error) throw referralResult.error;

      console.log("Referral Commissions Data:", {
        referralCommissions,
        referralCount: referralCommissions?.length || 0,
        totalAmount: referralCommissions?.reduce((sum, r) => sum + Number(r.referrer_commission || 0), 0) || 0
      });

      // 3. Fetch tips payments (separate from tips table)
      const { data: tipPayments, error: tipPaymentsError } = await supabaseAdmin
        .from("payments")
        .select("amount, created_at, payment_type, payment_status")
        .eq("user_id", userId)
        .eq("payment_type", "tip")
        .eq("payment_status", "completed");

      if (tipPaymentsError) throw tipPaymentsError;

      console.log("Tip Payments Data:", {
        tipPayments,
        tipPaymentsCount: tipPayments?.length || 0,
        totalTipAmount: tipPayments?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0
      });

      // 4. Fetch event host commissions
      const { data: eventCommissions, error: eventError } = await supabaseAdmin
        .from("payments")
        .select("event_host_commission, created_at, event_id")
        .eq("user_id", userId)
        .not("event_host_commission", "is", null)
        .eq("payment_status", "completed");

      if (eventError) throw eventError;

      // 4. Fetch weekly earnings - EXACT SAME AS UserEarningsTab
      console.log("🔍 QUERYING WEEKLY EARNINGS FOR USER_ID:", userId);
      const weeklyResult = await supabaseAdmin
        .from("weekly_earnings")
        .select("*")
        .eq("user_id", userId)
        .order("week_start", { ascending: false });

      if (weeklyResult.error) throw weeklyResult.error;

      const weeklyEarnings = weeklyResult.data;
      console.log("🔍 WEEKLY EARNINGS RESULT:", { weeklyEarnings, error: weeklyResult.error });
      console.log("Weekly Earnings Data:", {
        weeklyEarnings,
        weeklyCount: weeklyEarnings?.length || 0,
        totalWeeklyAmount: weeklyEarnings?.reduce((sum, w) => sum + Number(w.amount || 0), 0) || 0
      });

      // 6. Fetch commission payouts
      const { data: commissionPayouts, error: payoutError } = await supabaseAdmin
        .from("commission_payouts")
        .select("id, amount, commission_type, payout_status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (payoutError) throw payoutError;

      // === CALCULATIONS ===

      // Tips calculations (use tips from payments table for consistency)
      const tipsTotal = (tipPayments || []).reduce(
        (sum, tip) => sum + Number(tip.amount || 0), 0
      );
      const tipsThisWeek = (tipPayments || [])
        .filter((tip) => new Date(tip.created_at as string) >= weekStart)
        .reduce((sum, tip) => sum + Number(tip.amount || 0), 0);
      const tipsThisMonth = (tipPayments || [])
        .filter((tip) => new Date(tip.created_at as string) >= monthStart)
        .reduce((sum, tip) => sum + Number(tip.amount || 0), 0);

      // Referral earnings calculations (from payments table using referrer_commission field)
      const referralTotal = (referralCommissions || []).reduce(
        (sum, commission) => sum + Number(commission.referrer_commission || 0), 0
      );
      const referralThisWeek = (referralCommissions || [])
        .filter((commission) => new Date(commission.created_at as string) >= weekStart)
        .reduce((sum, commission) => sum + Number(commission.referrer_commission || 0), 0);
      const referralThisMonth = (referralCommissions || [])
        .filter((commission) => new Date(commission.created_at as string) >= monthStart)
        .reduce((sum, commission) => sum + Number(commission.referrer_commission || 0), 0);

      // Event commissions calculations
      const eventTotal = (eventCommissions || []).reduce(
        (sum, commission) => sum + Number(commission.event_host_commission || 0), 0
      );
      const eventThisWeek = (eventCommissions || [])
        .filter((commission) => new Date(commission.created_at as string) >= weekStart)
        .reduce((sum, commission) => sum + Number(commission.event_host_commission || 0), 0);
      const eventThisMonth = (eventCommissions || [])
        .filter((commission) => new Date(commission.created_at as string) >= monthStart)
        .reduce((sum, commission) => sum + Number(commission.event_host_commission || 0), 0);

      // Calculate earnings using EXACT SAME logic as UserEarningsTab
      const weeklyTotal = weeklyEarnings?.reduce((sum, earning) => sum + Number(earning.amount || 0), 0) || 0;
      const paymentsTotal = referralTotal + tipsTotal;
      const totalEarnings = Math.max(paymentsTotal, weeklyTotal);

      // Payouts calculation
      const paidOut = (commissionPayouts || [])
        .filter((payout) => payout.payout_status === "completed")
        .reduce((sum, payout) => sum + Number(payout.amount || 0), 0);

      // Available for withdrawal = Total earnings - Paid out
      const availableForWithdrawal = totalEarnings - paidOut;

      console.log("=== FINAL CALCULATIONS ===");
      console.log({
        tipsTotal,
        referralTotal,
        eventTotal,
        totalEarnings,
        paidOut,
        availableForWithdrawal
      });

      const detailedEarnings: DetailedEarningsData = {
        totalEarnings,
        availableForWithdrawal,
        tipsReceived: {
          total: tipsTotal,
          count: (tipPayments || []).length,
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
          currentTickets: 0,
          totalTickets: 0,
          winnings: [],
        },
        weeklyEarnings: (weeklyEarnings || []).map(week => ({
          week_start: String(week.week_start),
          week_end: String(week.week_end),
          tip_earnings: Number(week.tip_earnings) || 0,
          referral_earnings: Number(week.referral_earnings) || 0,
          bonus_earnings: Number(week.bonus_earnings) || 0,
          total: Number(week.amount) || 0
        })),
        commissionPayouts: (commissionPayouts || []).map(payout => ({
          id: String(payout.id),
          amount: Number(payout.amount) || 0,
          commission_type: String(payout.commission_type),
          payout_status: String(payout.payout_status),
          created_at: String(payout.created_at)
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
                      Total Earnings (Lifetime)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-800">
                      {formatCurrency(earnings.totalEarnings)}
                    </div>
                    <p className="text-xs text-green-600 mt-1">All time earnings</p>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-blue-700">
                      Available for Withdrawal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-800">
                      {formatCurrency(earnings.availableForWithdrawal)}
                    </div>
                    <p className="text-xs text-blue-600 mt-1">Ready to payout</p>
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
                    <p className="text-xs text-purple-600 mt-1">{earnings.tipsReceived.count} tips</p>
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
                    <p className="text-xs text-orange-600 mt-1">10% & 20% commissions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Tabs */}
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "summary" | "weekly" | "payouts")}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly History</TabsTrigger>
                  <TabsTrigger value="payouts">Payouts</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Tips Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span className="font-semibold">{formatCurrency(earnings.tipsReceived.total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>This Week:</span>
                          <span>{formatCurrency(earnings.tipsReceived.thisWeek)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>This Month:</span>
                          <span>{formatCurrency(earnings.tipsReceived.thisMonth)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Count:</span>
                          <span>{earnings.tipsReceived.count}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Referral Commissions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span className="font-semibold">{formatCurrency(earnings.referralEarnings.total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>This Week:</span>
                          <span>{formatCurrency(earnings.referralEarnings.thisWeek)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>This Month:</span>
                          <span>{formatCurrency(earnings.referralEarnings.thisMonth)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Count:</span>
                          <span>{earnings.referralEarnings.count}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Event Commissions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span className="font-semibold">{formatCurrency(earnings.eventCommissions.total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>This Week:</span>
                          <span>{formatCurrency(earnings.eventCommissions.thisWeek)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>This Month:</span>
                          <span>{formatCurrency(earnings.eventCommissions.thisMonth)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Count:</span>
                          <span>{earnings.eventCommissions.count}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="weekly" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Earnings History</CardTitle>
                      <p className="text-sm text-gray-600">From weekly_earnings table</p>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Week Period</TableHead>
                            <TableHead>Tips</TableHead>
                            <TableHead>Referrals</TableHead>
                            <TableHead>Bonuses</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {earnings.weeklyEarnings.map((week, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                {new Date(week.week_start).toLocaleDateString()} - {new Date(week.week_end).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{formatCurrency(week.tip_earnings)}</TableCell>
                              <TableCell>{formatCurrency(week.referral_earnings)}</TableCell>
                              <TableCell>{formatCurrency(week.bonus_earnings)}</TableCell>
                              <TableCell className="font-semibold">{formatCurrency(week.total)}</TableCell>
                            </TableRow>
                          ))}
                          {earnings.weeklyEarnings.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-gray-500">
                                No weekly earnings data found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payouts" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Commission Payouts</CardTitle>
                      <p className="text-sm text-gray-600">Requested payouts and their status</p>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {earnings.commissionPayouts.map((payout) => (
                            <TableRow key={payout.id}>
                              <TableCell>
                                {new Date(payout.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{payout.commission_type}</TableCell>
                              <TableCell>{formatCurrency(payout.amount)}</TableCell>
                              <TableCell>{getStatusBadge(payout.payout_status)}</TableCell>
                            </TableRow>
                          ))}
                          {earnings.commissionPayouts.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-gray-500">
                                No payouts requested yet
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEarningsTab;
