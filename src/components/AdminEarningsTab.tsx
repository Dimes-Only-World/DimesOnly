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
import { 
  DollarSign, 
  Search, 
  TrendingUp, 
  Users, 
  Calendar, 
  Download,
  ArrowUpDown,
  Filter
} from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

interface PayPeriod {
  id: string;
  startDate: Date;
  endDate: Date;
  payDate: Date;
  label: string;
}

interface UserEarnings {
  id: string;
  username: string;
  user_type: string;
  referralEarnings: number;
  tipsReceived: number;
  eventCommissions: number;
  totalEarnings: number;
  rank: number;
}

interface PayPeriodEarnings {
  payPeriod: PayPeriod;
  users: UserEarnings[];
  totalPayout: number;
  userCount: number;
}

const AdminEarningsTab: React.FC = () => {
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [selectedPayPeriod, setSelectedPayPeriod] = useState<string>("");
  const [payPeriodEarnings, setPayPeriodEarnings] = useState<PayPeriodEarnings | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"earnings" | "username" | "rank">("earnings");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { toast } = useToast();

  useEffect(() => {
    generatePayPeriods();
  }, []);

  useEffect(() => {
    if (selectedPayPeriod) {
      fetchPayPeriodEarnings(selectedPayPeriod);
    }
  }, [selectedPayPeriod]);

  // Generate pay periods for the current year
  const generatePayPeriods = () => {
    const currentYear = new Date().getFullYear();
    const periods: PayPeriod[] = [];
    
    for (let month = 0; month < 12; month++) {
      // First half: 1st to 15th
      const firstHalfStart = new Date(currentYear, month, 1);
      const firstHalfEnd = new Date(currentYear, month, 15);
      const firstHalfPayDate = new Date(currentYear, month + 1, 1);
      
      periods.push({
        id: `first_${month + 1}`,
        startDate: firstHalfStart,
        endDate: firstHalfEnd,
        payDate: firstHalfPayDate,
        label: `${firstHalfStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${firstHalfEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → Pays ${firstHalfPayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      });

      // Second half: 16th to last day of month
      const secondHalfStart = new Date(currentYear, month, 16);
      const secondHalfEnd = new Date(currentYear, month + 1, 0); // Last day of month
      const secondHalfPayDate = new Date(currentYear, month + 1, 15);
      
      periods.push({
        id: `second_${month + 1}`,
        startDate: secondHalfStart,
        endDate: secondHalfEnd,
        payDate: secondHalfPayDate,
        label: `${secondHalfStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${secondHalfEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} → Pays ${secondHalfPayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      });
    }

    // Sort by start date (most recent first)
    periods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    setPayPeriods(periods);
    
    // Auto-select the most recent period
    if (periods.length > 0) {
      setSelectedPayPeriod(periods[0].id);
    }
  };

  const fetchPayPeriodEarnings = async (periodId: string) => {
    setLoading(true);
    try {
      const selectedPeriod = payPeriods.find(p => p.id === periodId);
      if (!selectedPeriod) return;

      console.log("=== FETCHING PAY PERIOD EARNINGS ===");
      console.log("Period:", selectedPeriod.label);
      console.log("Date Range:", selectedPeriod.startDate.toISOString(), "to", selectedPeriod.endDate.toISOString());

      // 1. Fetch all users
      const { data: users, error: usersError } = await supabaseAdmin
        .from("users")
        .select("id, username, user_type")
        .order("username");

      if (usersError) throw usersError;

      // 2. Fetch referral commissions for this period
      const { data: referralCommissions, error: referralError } = await supabaseAdmin
        .from("payments")
        .select("referred_by, referrer_commission, created_at")
        .not("referrer_commission", "is", null)
        .gte("created_at", selectedPeriod.startDate.toISOString())
        .lte("created_at", selectedPeriod.endDate.toISOString())
        .eq("payment_status", "completed");

      if (referralError) throw referralError;

      // 3. Fetch tips for this period
      const { data: tips, error: tipsError } = await supabaseAdmin
        .from("payments")
        .select("user_id, amount, created_at")
        .eq("payment_type", "tip")
        .eq("payment_status", "completed")
        .gte("created_at", selectedPeriod.startDate.toISOString())
        .lte("created_at", selectedPeriod.endDate.toISOString());

      if (tipsError) throw tipsError;

      // 4. Fetch event commissions for this period
      const { data: eventCommissions, error: eventError } = await supabaseAdmin
        .from("payments")
        .select("user_id, event_host_commission, created_at")
        .not("event_host_commission", "is", null)
        .eq("payment_status", "completed")
        .gte("created_at", selectedPeriod.startDate.toISOString())
        .lte("created_at", selectedPeriod.endDate.toISOString());

      if (eventError) throw eventError;

      // 5. Calculate earnings for each user
      const userEarnings: UserEarnings[] = users.map(user => {
        // Referral earnings (from referrer_commission field)
        const userReferralEarnings = (referralCommissions || [])
          .filter(commission => commission.referred_by === user.username)
          .reduce((sum, commission) => sum + Number(commission.referrer_commission || 0), 0);

        // Tips received
        const userTips = (tips || [])
          .filter(tip => tip.user_id === user.id)
          .reduce((sum, tip) => sum + Number(tip.amount || 0), 0);

        // Event commissions
        const userEventCommissions = (eventCommissions || [])
          .filter(commission => commission.user_id === user.id)
          .reduce((sum, commission) => sum + Number(commission.event_host_commission || 0), 0);

        const totalEarnings = userReferralEarnings + userTips + userEventCommissions;

        return {
          id: user.id,
          username: user.username,
          user_type: user.user_type,
          referralEarnings: userReferralEarnings,
          tipsReceived: userTips,
          eventCommissions: userEventCommissions,
          totalEarnings: totalEarnings,
          rank: 0 // Will be set after sorting
        };
      });

      // 6. Sort by total earnings (highest first) and assign ranks
      userEarnings.sort((a, b) => b.totalEarnings - a.totalEarnings);
      userEarnings.forEach((user, index) => {
        user.rank = index + 1;
      });

      // 7. Filter out users with 0 earnings if needed
      const usersWithEarnings = userEarnings.filter(user => user.totalEarnings > 0);

      // 8. Calculate total payout for this period
      const totalPayout = usersWithEarnings.reduce((sum, user) => sum + user.totalEarnings, 0);

      const periodEarnings: PayPeriodEarnings = {
        payPeriod: selectedPeriod,
        users: usersWithEarnings,
        totalPayout: totalPayout,
        userCount: usersWithEarnings.length
      };

      setPayPeriodEarnings(periodEarnings);

      console.log("=== PAY PERIOD EARNINGS CALCULATED ===");
      console.log("Total Users with Earnings:", usersWithEarnings.length);
      console.log("Total Payout:", totalPayout);
      console.log("Top Earner:", usersWithEarnings[0]?.username, "- $", usersWithEarnings[0]?.totalEarnings);

    } catch (error) {
      console.error("Error fetching pay period earnings:", error);
      toast({
        title: "Error",
        description: "Failed to fetch pay period earnings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!payPeriodEarnings) return;

    const { payPeriod, users } = payPeriodEarnings;
    
    // CSV headers
    const headers = [
      "Rank",
      "Username", 
      "User Type",
      "Referral Earnings (20%/10%)",
      "Tips Received",
      "Event Commissions",
      "Total Earnings",
      "Pay Period",
      "Pay Date"
    ];

    // CSV data rows
    const csvData = users.map(user => [
      user.rank,
      user.username,
      user.user_type,
      user.referralEarnings.toFixed(2),
      user.tipsReceived.toFixed(2),
      user.eventCommissions.toFixed(2),
      user.totalEarnings.toFixed(2),
      `${payPeriod.startDate.toLocaleDateString()} - ${payPeriod.endDate.toLocaleDateString()}`,
      payPeriod.payDate.toLocaleDateString()
    ]);

    // Combine headers and data
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payroll_${payPeriod.startDate.toISOString().split('T')[0]}_to_${payPeriod.endDate.toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "CSV Exported",
      description: `Payroll data exported for ${payPeriod.startDate.toLocaleDateString()} - ${payPeriod.endDate.toLocaleDateString()}`,
    });
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const getSortIcon = (field: string) => {
    if (sortBy === field) {
      return sortOrder === "desc" ? "↓" : "↑";
    }
    return "↕";
  };

  const handleSort = (field: "earnings" | "username" | "rank") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getSortedUsers = () => {
    if (!payPeriodEarnings) return [];
    
    const users = [...payPeriodEarnings.users];
    
    switch (sortBy) {
      case "earnings":
        return users.sort((a, b) => 
          sortOrder === "desc" ? b.totalEarnings - a.totalEarnings : a.totalEarnings - b.totalEarnings
        );
      case "username":
        return users.sort((a, b) => 
          sortOrder === "desc" ? b.username.localeCompare(a.username) : a.username.localeCompare(b.username)
        );
      case "rank":
        return users.sort((a, b) => 
          sortOrder === "desc" ? b.rank - a.rank : a.rank - b.rank
        );
      default:
        return users;
    }
  };

  const filteredUsers = getSortedUsers().filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Payroll Dashboard - Master Earnings List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-4">
            {/* Pay Period Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Pay Period</Label>
              <Select
                value={selectedPayPeriod}
                onValueChange={setSelectedPayPeriod}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a pay period" />
                </SelectTrigger>
                <SelectContent>
                  {payPeriods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search and Export */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Button 
                onClick={exportToCSV} 
                disabled={!payPeriodEarnings || payPeriodEarnings.users.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to CSV
              </Button>
            </div>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading pay period earnings data...</p>
            </div>
          )}

          {payPeriodEarnings && !loading && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-green-700">
                      Total Payout for Period
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-800">
                      {formatCurrency(payPeriodEarnings.totalPayout)}
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      {payPeriodEarnings.payPeriod.startDate.toLocaleDateString()} - {payPeriodEarnings.payPeriod.endDate.toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-blue-700">
                      Users with Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-800">
                      {payPeriodEarnings.userCount}
                    </div>
                    <p className="text-xs text-blue-600 mt-1">Active earners this period</p>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-purple-700">
                      Pay Date
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-800">
                      {payPeriodEarnings.payPeriod.payDate.toLocaleDateString()}
                    </div>
                    <p className="text-xs text-purple-600 mt-1">14-day refund buffer</p>
                  </CardContent>
                </Card>
              </div>

              {/* Earnings Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Earnings Ranking - {payPeriodEarnings.payPeriod.label}</span>
                    <div className="text-sm text-gray-500">
                      {filteredUsers.length} users • {formatCurrency(payPeriodEarnings.totalPayout)} total
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("rank")}
                        >
                          <div className="flex items-center gap-2">
                            Rank {getSortIcon("rank")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("username")}
                        >
                          <div className="flex items-center gap-2">
                            Username {getSortIcon("username")}
                          </div>
                        </TableHead>
                        <TableHead>User Type</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort("earnings")}
                        >
                          <div className="flex items-center gap-2">
                            Total Earnings {getSortIcon("earnings")}
                          </div>
                        </TableHead>
                        <TableHead>Referral (20%/10%)</TableHead>
                        <TableHead>Tips</TableHead>
                        <TableHead>Event Commissions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Badge variant={user.rank <= 3 ? "default" : "secondary"}>
                              #{user.rank}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.user_type}</Badge>
                          </TableCell>
                          <TableCell className="font-bold text-green-600">
                            {formatCurrency(user.totalEarnings)}
                          </TableCell>
                          <TableCell className="text-blue-600">
                            {formatCurrency(user.referralEarnings)}
                          </TableCell>
                          <TableCell className="text-purple-600">
                            {formatCurrency(user.tipsReceived)}
                          </TableCell>
                          <TableCell className="text-orange-600">
                            {formatCurrency(user.eventCommissions)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                            {searchTerm ? "No users found matching your search" : "No earnings data for this pay period"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {!payPeriodEarnings && !loading && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a pay period to view earnings data</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEarningsTab;
