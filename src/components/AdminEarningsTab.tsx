import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Users,
  Calendar,
  Download,
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

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const AdminEarningsTab: React.FC = () => {
  const [payPeriods, setPayPeriods] = useState<PayPeriod[]>([]);
  const [selectedPayPeriod, setSelectedPayPeriod] = useState<string>("");
  const [payPeriodEarnings, setPayPeriodEarnings] =
    useState<PayPeriodEarnings | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"earnings" | "username" | "rank">(
    "earnings",
  );
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

  const generatePayPeriods = () => {
    const currentYear = new Date().getFullYear();
    const periods: PayPeriod[] = [];

    for (let month = 0; month < 12; month++) {
      const firstHalfStart = new Date(currentYear, month, 1);
      const firstHalfEnd = new Date(currentYear, month, 15);
      const firstHalfPayDate = new Date(currentYear, month + 1, 1);

      periods.push({
        id: `first_${month + 1}`,
        startDate: firstHalfStart,
        endDate: firstHalfEnd,
        payDate: firstHalfPayDate,
        label: `${firstHalfStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${firstHalfEnd.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} → Pays ${firstHalfPayDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`,
      });

      const secondHalfStart = new Date(currentYear, month, 16);
      const secondHalfEnd = new Date(currentYear, month + 1, 0);
      const secondHalfPayDate = new Date(currentYear, month + 1, 15);

      periods.push({
        id: `second_${month + 1}`,
        startDate: secondHalfStart,
        endDate: secondHalfEnd,
        payDate: secondHalfPayDate,
        label: `${secondHalfStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${secondHalfEnd.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} → Pays ${secondHalfPayDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`,
      });
    }

    periods.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    setPayPeriods(periods);

    if (periods.length > 0) {
      setSelectedPayPeriod(periods[0].id);
    }
  };

  const fetchPayPeriodEarnings = async (periodId: string) => {
    setLoading(true);
    try {
      const selectedPeriod = payPeriods.find((p) => p.id === periodId);
      if (!selectedPeriod) return;

      const { data: users, error: usersError } = await supabaseAdmin
        .from("users")
        .select("id, username, user_type")
        .order("username");

      if (usersError) throw usersError;

      const { data: referralCommissions, error: referralError } =
        await supabaseAdmin
          .from("payments")
          .select("referred_by, referrer_commission, created_at")
          .not("referrer_commission", "is", null)
          .gte("created_at", startOfDay(selectedPeriod.startDate).toISOString())
          .lte("created_at", endOfDay(selectedPeriod.endDate).toISOString())
          .eq("payment_status", "completed");

      if (referralError) throw referralError;

      const { data: tips, error: tipsError } = await supabaseAdmin
        .from("tips")
        .select("tipped_username, tip_amount, created_at, status")
        .eq("status", "completed")
        .gte("created_at", startOfDay(selectedPeriod.startDate).toISOString())
        .lte("created_at", endOfDay(selectedPeriod.endDate).toISOString());

      if (tipsError) throw tipsError;

      const { data: eventCommissions, error: eventError } =
        await supabaseAdmin
          .from("payments")
          .select("user_id, event_host_commission, created_at")
          .not("event_host_commission", "is", null)
          .eq("payment_status", "completed")
          .gte("created_at", startOfDay(selectedPeriod.startDate).toISOString())
          .lte("created_at", endOfDay(selectedPeriod.endDate).toISOString());

      if (eventError) throw eventError;

      const typedUsers = (users || []) as Array<{
        id: string;
        username: string;
        user_type: string;
      }>;

      const referralRows = (referralCommissions || []) as Array<{
        referred_by: string | null;
        referrer_commission: number | null;
      }>;

      const tipRows = (tips || []) as Array<{
        tipped_username: string | null;
        tip_amount: number | null;
      }>;

      const eventRows = (eventCommissions || []) as Array<{
        user_id: string | null;
        event_host_commission: number | null;
      }>;

      const augmentedUsers = [...typedUsers];

      referralRows.forEach((row) => {
        const referredBy = (row.referred_by || "").trim();
        if (!referredBy) return;
        const lower = referredBy.toLowerCase();
        const exists = augmentedUsers.some(
          (user) => (user.username || "").toLowerCase() === lower,
        );
        if (!exists) {
          augmentedUsers.push({
            id: `referrer:${lower}`,
            username: referredBy,
            user_type: "referrer",
          });
        }
      });

      const userEarnings: UserEarnings[] = augmentedUsers.map((user) => {
        const username = user.username || "";
        const usernameLower = username.toLowerCase();

        const userReferralEarnings = referralRows
          .filter(
            (commission) =>
              (commission.referred_by || "").toLowerCase() === usernameLower,
          )
          .reduce(
            (sum, commission) =>
              sum + Number(commission.referrer_commission || 0),
            0,
          );

        const userTips = tipRows
          .filter(
            (tip) =>
              (tip.tipped_username || "").toLowerCase() === usernameLower,
          )
          .reduce((sum, tip) => sum + Number(tip.tip_amount || 0), 0);

        const userEventCommissions = eventRows
          .filter((commission) => commission.user_id === user.id)
          .reduce(
            (sum, commission) =>
              sum + Number(commission.event_host_commission || 0),
            0,
          );

        const totalEarnings =
          userReferralEarnings + userTips + userEventCommissions;

        return {
          id: user.id,
          username,
          user_type: user.user_type,
          referralEarnings: userReferralEarnings,
          tipsReceived: userTips,
          eventCommissions: userEventCommissions,
          totalEarnings,
          rank: 0,
        };
      });

      userEarnings.sort((a, b) => b.totalEarnings - a.totalEarnings);
      userEarnings.forEach((user, index) => {
        user.rank = index + 1;
      });

      const activeEarners = userEarnings.filter(
        (user) => user.totalEarnings > 0,
      );
      const displayUsers = userEarnings.filter(
        (user) =>
          user.totalEarnings > 0 ||
          user.referralEarnings > 0 ||
          user.tipsReceived > 0 ||
          user.eventCommissions > 0,
      );
      const totalPayout = activeEarners.reduce(
        (sum, user) => sum + user.totalEarnings,
        0,
      );

      const periodEarnings: PayPeriodEarnings = {
        payPeriod: selectedPeriod,
        users: displayUsers,
        totalPayout,
        userCount: activeEarners.length,
      };

      setPayPeriodEarnings(periodEarnings);

      console.log("=== PAY PERIOD EARNINGS CALCULATED ===");
      console.log("Total Users with Earnings:", activeEarners.length);
      console.log("Total Payout:", totalPayout);
      if (activeEarners.length > 0) {
        console.log(
          "Top Earner:",
          activeEarners[0].username,
          "- $",
          activeEarners[0].totalEarnings,
        );
      }
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

    const headers = [
      "Rank",
      "Username",
      "User Type",
      "Referral Earnings (20%/10%)",
      "Tips Received",
      "Event Commissions",
      "Total Earnings",
      "Pay Period",
      "Pay Date",
    ];

    const csvData = users.map((user) => [
      user.rank,
      user.username,
      user.user_type,
      user.referralEarnings.toFixed(2),
      user.tipsReceived.toFixed(2),
      user.eventCommissions.toFixed(2),
      user.totalEarnings.toFixed(2),
      `${payPeriod.startDate.toLocaleDateString()} - ${payPeriod.endDate.toLocaleDateString()}`,
      payPeriod.payDate.toLocaleDateString(),
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `payroll_${payPeriod.startDate
      .toISOString()
      .split("T")[0]}_to_${payPeriod.endDate.toISOString().split("T")[0]}.csv`;
    link.style.visibility = "hidden";
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

  const filteredUsers = useMemo(() => {
    if (!payPeriodEarnings) return [];

    const users = [...payPeriodEarnings.users];

    const sorted = (() => {
      switch (sortBy) {
        case "earnings":
          return users.sort((a, b) =>
            sortOrder === "desc"
              ? b.totalEarnings - a.totalEarnings
              : a.totalEarnings - b.totalEarnings,
          );
        case "username":
          return users.sort((a, b) =>
            sortOrder === "desc"
              ? b.username.localeCompare(a.username)
              : a.username.localeCompare(b.username),
          );
        case "rank":
          return users.sort((a, b) =>
            sortOrder === "desc" ? b.rank - a.rank : a.rank - b.rank,
          );
        default:
          return users;
      }
    })();

    return sorted.filter((user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [payPeriodEarnings, sortBy, sortOrder, searchTerm]);

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

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                disabled={
                  !payPeriodEarnings || payPeriodEarnings.users.length === 0
                }
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
              </Button>
            </div>
          </div>

          {loading && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="text-gray-500">
                Loading pay period earnings data...
              </p>
            </div>
          )}

          {payPeriodEarnings && !loading && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                    <p className="mt-1 text-xs text-green-600">
                      {payPeriodEarnings.payPeriod.startDate.toLocaleDateString()}{" "}
                      -{" "}
                      {payPeriodEarnings.payPeriod.endDate.toLocaleDateString()}
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
                    <p className="mt-1 text-xs text-blue-600">
                      Active earners this period
                    </p>
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
                    <p className="mt-1 text-xs text-purple-600">
                      14-day refund buffer
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      Earnings Ranking - {payPeriodEarnings.payPeriod.label}
                    </span>
                    <div className="text-sm text-gray-500">
                      {filteredUsers.length} users •{" "}
                      {formatCurrency(payPeriodEarnings.totalPayout)} total
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
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="py-8 text-center text-gray-500"
                          >
                            {searchTerm
                              ? "No users found matching your search"
                              : "No earnings data for this pay period"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user) => (
                          <TableRow key={`${user.id}:${user.username}`}>
                            <TableCell>
                              <Badge
                                variant={
                                  user.rank <= 3 ? "default" : "secondary"
                                }
                              >
                                #{user.rank}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {user.username}
                            </TableCell>
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
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {!payPeriodEarnings && !loading && (
            <div className="py-12 text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">
                Select a pay period to view earnings data
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEarningsTab;