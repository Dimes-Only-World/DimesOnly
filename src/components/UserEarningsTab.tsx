import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Calendar,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Award,
  Users,
  Building,
  Mail,
  MapPin,
  Smartphone,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/contexts/AppContext";
import PaymentStatus from "@/components/PaymentStatus";
import JackpotBreakdown from "@/components/JackpotBreakdown";
import { useMobileLayout } from "@/hooks/use-mobile";

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

interface JackpotTicket {
  id: string;
  user_id: string;
  tickets_count: number;
  draw_date: string;
  created_at: string;
  is_winner?: boolean;
}

interface JackpotWinning {
  id: string;
  user_id: string;
  amount_won: number;
  draw_date: string;
  created_at: string;
  username: string;
  year: number;
}

interface CommissionPayout {
  id: string;
  user_id: string;
  amount: number;
  commission_type: string;
  payout_status: string;
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

interface PayoutFormData {
  payoutMethod: "cashapp" | "paypal" | "wire" | "check" | "";
  // PayPal
  paypalEmail: string;
  // CashApp
  cashappCashtag: string;
  cashappPhone: string;
  cashappEmail: string;
  // Wire Transfer
  wireBankName: string;
  wireRoutingNumber: string;
  wireAccountNumber: string;
  wireAccountHolderName: string;
  wireAccountType: "checking" | "savings" | "";
  wireBankAddress: string;
  wireSwiftCode: string;
  // Check by Mail
  checkFullName: string;
  checkAddressLine1: string;
  checkAddressLine2: string;
  checkCity: string;
  checkState: string;
  checkZipCode: string;
  checkCountry: string;
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
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [payoutFormData, setPayoutFormData] = useState<PayoutFormData>({
    payoutMethod: "",
    paypalEmail: "",
    cashappCashtag: "",
    cashappPhone: "",
    cashappEmail: "",
    wireBankName: "",
    wireRoutingNumber: "",
    wireAccountNumber: "",
    wireAccountHolderName: "",
    wireAccountType: "",
    wireBankAddress: "",
    wireSwiftCode: "",
    checkFullName: "",
    checkAddressLine1: "",
    checkAddressLine2: "",
    checkCity: "",
    checkState: "",
    checkZipCode: "",
    checkCountry: "United States",
  });
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [recentActivity, setRecentActivity] = useState({
    tips: 0,
    referrals: 0,
    photos: 0,
    videos: 0,
    messages: 0,
    events: 0,
  });
  const [recentEarnings, setRecentEarnings] = useState(0);
  const { toast } = useToast();
  const { user } = useAppContext();
  const { getContainerClasses, getContentClasses } = useMobileLayout();

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

  // Calculate recent earnings (last 7 days)
  const calculateRecentEarnings = (days: number) => {
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

  // Update recent earnings when tips or referrals change
  useEffect(() => {
    if (tipsReceived.length > 0 || referralCommissions.length > 0) {
      setRecentEarnings(getRecentEarnings(7));
    }
  }, [tipsReceived, referralCommissions]);

  useEffect(() => {
    if (userData?.id) {
      fetchAllEarningsData();
      fetchTotalReferrals();
    }
  }, [userData?.id]);

  // Fetch total number of users referred by this user
  const fetchTotalReferrals = async () => {
    if (!userData?.username) return;

    const { data, error } = await supabase
      .from("users")
      .select("count")
      .eq("referred_by", userData.username)
      .single();

    if (!error && data) {
      setTotalReferrals(data.count || 0);
    }
  };

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
      const tickets =
        (jackpotTicketsResult.data as unknown as JackpotTicket[]) || [];
      const winnings =
        (jackpotWinningsResult.data as unknown as JackpotWinning[]) || [];
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
      const paidOut = (
        (payoutsResult.data as unknown as CommissionPayout[]) || []
      ).reduce((sum, payout) => sum + (Number(payout.amount) || 0), 0);
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

  const handlePayoutRequest = async () => {
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

  const handlePayoutFormSubmit = async () => {
    if (!payoutFormData.payoutMethod) {
      toast({
        title: "Missing Information",
        description: "Please select a payout method",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields based on payout method
    const isValid = validatePayoutForm();
    if (!isValid) return;

    setSubmittingPayout(true);

    try {
      // Calculate next payout date
      const { data: nextPayoutResult, error: payoutDateError } =
        await supabase.rpc("calculate_next_payout_date");

      if (payoutDateError) {
        console.error("Error calculating payout date:", payoutDateError);
        throw new Error("Failed to calculate payout date");
      }

      // Insert payout request
      const { data, error } = await supabase
        .from("payout_requests")
        .insert({
          user_id: userData.id,
          amount: availableForWithdrawal,
          payout_method: payoutFormData.payoutMethod,
          scheduled_payout_date: nextPayoutResult,

          // PayPal fields
          paypal_email:
            payoutFormData.payoutMethod === "paypal"
              ? payoutFormData.paypalEmail
              : null,

          // CashApp fields
          cashapp_cashtag:
            payoutFormData.payoutMethod === "cashapp"
              ? payoutFormData.cashappCashtag
              : null,
          cashapp_phone:
            payoutFormData.payoutMethod === "cashapp"
              ? payoutFormData.cashappPhone
              : null,
          cashapp_email:
            payoutFormData.payoutMethod === "cashapp"
              ? payoutFormData.cashappEmail
              : null,

          // Wire transfer fields
          wire_bank_name:
            payoutFormData.payoutMethod === "wire"
              ? payoutFormData.wireBankName
              : null,
          wire_routing_number:
            payoutFormData.payoutMethod === "wire"
              ? payoutFormData.wireRoutingNumber
              : null,
          wire_account_number:
            payoutFormData.payoutMethod === "wire"
              ? payoutFormData.wireAccountNumber
              : null,
          wire_account_holder_name:
            payoutFormData.payoutMethod === "wire"
              ? payoutFormData.wireAccountHolderName
              : null,
          wire_account_type:
            payoutFormData.payoutMethod === "wire"
              ? payoutFormData.wireAccountType
              : null,
          wire_bank_address:
            payoutFormData.payoutMethod === "wire"
              ? payoutFormData.wireBankAddress
              : null,
          wire_swift_code:
            payoutFormData.payoutMethod === "wire"
              ? payoutFormData.wireSwiftCode
              : null,

          // Check fields
          check_full_name:
            payoutFormData.payoutMethod === "check"
              ? payoutFormData.checkFullName
              : null,
          check_address_line1:
            payoutFormData.payoutMethod === "check"
              ? payoutFormData.checkAddressLine1
              : null,
          check_address_line2:
            payoutFormData.payoutMethod === "check"
              ? payoutFormData.checkAddressLine2
              : null,
          check_city:
            payoutFormData.payoutMethod === "check"
              ? payoutFormData.checkCity
              : null,
          check_state:
            payoutFormData.payoutMethod === "check"
              ? payoutFormData.checkState
              : null,
          check_zip_code:
            payoutFormData.payoutMethod === "check"
              ? payoutFormData.checkZipCode
              : null,
          check_country:
            payoutFormData.payoutMethod === "check"
              ? payoutFormData.checkCountry
              : null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating payout request:", error);
        toast({
          title: "Error",
          description: "Failed to submit payout request. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Payout Request Submitted",
        description: `Your payout request for ${formatCurrency(
          availableForWithdrawal
        )} has been submitted and will be processed on ${new Date(
          nextPayoutResult as string
        ).toLocaleDateString()}.`,
      });

      // Reset form and close dialog
      setShowPayoutForm(false);
      resetPayoutForm();

      // Refresh earnings data
      fetchAllEarningsData();
    } catch (error) {
      console.error("Error requesting payout:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingPayout(false);
    }
  };

  const validatePayoutForm = (): boolean => {
    const { payoutMethod } = payoutFormData;

    if (payoutMethod === "paypal") {
      if (!payoutFormData.paypalEmail) {
        toast({
          title: "Missing Information",
          description: "PayPal email is required",
          variant: "destructive",
        });
        return false;
      }
    } else if (payoutMethod === "cashapp") {
      if (!payoutFormData.cashappCashtag) {
        toast({
          title: "Missing Information",
          description: "CashApp $cashtag is required",
          variant: "destructive",
        });
        return false;
      }
    } else if (payoutMethod === "wire") {
      const requiredWireFields = [
        "wireBankName",
        "wireRoutingNumber",
        "wireAccountNumber",
        "wireAccountHolderName",
        "wireAccountType",
      ];
      const missingField = requiredWireFields.find(
        (field) => !payoutFormData[field as keyof PayoutFormData]
      );
      if (missingField) {
        toast({
          title: "Missing Information",
          description: "All wire transfer fields are required",
          variant: "destructive",
        });
        return false;
      }
    } else if (payoutMethod === "check") {
      const requiredCheckFields = [
        "checkFullName",
        "checkAddressLine1",
        "checkCity",
        "checkState",
        "checkZipCode",
      ];
      const missingField = requiredCheckFields.find(
        (field) => !payoutFormData[field as keyof PayoutFormData]
      );
      if (missingField) {
        toast({
          title: "Missing Information",
          description: "All address fields are required for check payments",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const resetPayoutForm = () => {
    setPayoutFormData({
      payoutMethod: "",
      paypalEmail: "",
      cashappCashtag: "",
      cashappPhone: "",
      cashappEmail: "",
      wireBankName: "",
      wireRoutingNumber: "",
      wireAccountNumber: "",
      wireAccountHolderName: "",
      wireAccountType: "",
      wireBankAddress: "",
      wireSwiftCode: "",
      checkFullName: "",
      checkAddressLine1: "",
      checkAddressLine2: "",
      checkCity: "",
      checkState: "",
      checkZipCode: "",
      checkCountry: "United States",
    });
  };

  const updatePayoutFormData = (field: keyof PayoutFormData, value: string) => {
    setPayoutFormData((prev) => ({ ...prev, [field]: value }));
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
              {formatCurrency(recentEarnings)}
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
              {totalReferrals}
            </div>
            <p className="text-xs text-gray-500">Total referrals</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Earnings Tabs */}
      <Tabs defaultValue="weekly" className="w-full">
        <TabsList
          className={`grid grid-cols-2 sm:grid-cols-4 w-full gap-2 h-auto bg-white/10 backdrop-blur border-white/20 p-2 rounded-lg ${getContentClasses()}`}
        >
          <TabsTrigger
            value="weekly"
            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white border border-white/20 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200"
          >
            Weekly History
          </TabsTrigger>
          <TabsTrigger
            value="tips"
            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white border border-white/20 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200"
          >
            Tips Received
          </TabsTrigger>
          <TabsTrigger
            value="referrals"
            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white border border-white/20 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200"
          >
            Referrals
          </TabsTrigger>
          <TabsTrigger
            value="jackpot"
            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=inactive]:bg-white/5 data-[state=inactive]:text-white border border-white/20 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200"
          >
            Jackpot
          </TabsTrigger>
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
                disabled={availableForWithdrawal === 0}
              >
                Request Payout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout Request Form Dialog */}
      <Dialog open={showPayoutForm} onOpenChange={setShowPayoutForm}>
        <DialogContent className="bg-white max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Request Payout - {formatCurrency(availableForWithdrawal)}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Choose your payout method. Payouts are processed on the 1st and
              15th of each month.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh] space-y-6">
            {/* Payout Method Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                Select Payout Method *
              </Label>
              <Select
                value={payoutFormData.payoutMethod}
                onValueChange={(
                  value: "cashapp" | "paypal" | "wire" | "check"
                ) => updatePayoutFormData("payoutMethod", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose how you want to receive your funds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashapp">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      CashApp (Instant)
                    </div>
                  </SelectItem>
                  <SelectItem value="paypal">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      PayPal (1-2 days)
                    </div>
                  </SelectItem>
                  <SelectItem value="wire">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Wire Transfer (1-3 days)
                    </div>
                  </SelectItem>
                  <SelectItem value="check">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Check by Mail (5-7 days)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Form Fields */}
            {payoutFormData.payoutMethod === "paypal" && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-700 flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    PayPal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label
                      htmlFor="paypalEmail"
                      className="text-sm font-medium text-gray-700"
                    >
                      PayPal Email Address *
                    </Label>
                    <Input
                      id="paypalEmail"
                      type="email"
                      value={payoutFormData.paypalEmail}
                      onChange={(e) =>
                        updatePayoutFormData("paypalEmail", e.target.value)
                      }
                      placeholder="your-email@example.com"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the email address associated with your PayPal
                      account
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {payoutFormData.payoutMethod === "cashapp" && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg text-green-700 flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    CashApp Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label
                      htmlFor="cashappCashtag"
                      className="text-sm font-medium text-gray-700"
                    >
                      CashApp $Cashtag *
                    </Label>
                    <Input
                      id="cashappCashtag"
                      value={payoutFormData.cashappCashtag}
                      onChange={(e) =>
                        updatePayoutFormData("cashappCashtag", e.target.value)
                      }
                      placeholder="$YourCashtag"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="cashappPhone"
                      className="text-sm font-medium text-gray-700"
                    >
                      Phone Number (Optional)
                    </Label>
                    <Input
                      id="cashappPhone"
                      value={payoutFormData.cashappPhone}
                      onChange={(e) =>
                        updatePayoutFormData("cashappPhone", e.target.value)
                      }
                      placeholder="(555) 123-4567"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="cashappEmail"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email Address (Optional)
                    </Label>
                    <Input
                      id="cashappEmail"
                      type="email"
                      value={payoutFormData.cashappEmail}
                      onChange={(e) =>
                        updatePayoutFormData("cashappEmail", e.target.value)
                      }
                      placeholder="your-email@example.com"
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {payoutFormData.payoutMethod === "wire" && (
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-lg text-purple-700 flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Wire Transfer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="wireBankName"
                        className="text-sm font-medium text-gray-700"
                      >
                        Bank Name *
                      </Label>
                      <Input
                        id="wireBankName"
                        value={payoutFormData.wireBankName}
                        onChange={(e) =>
                          updatePayoutFormData("wireBankName", e.target.value)
                        }
                        placeholder="Bank of America"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="wireRoutingNumber"
                        className="text-sm font-medium text-gray-700"
                      >
                        Routing Number *
                      </Label>
                      <Input
                        id="wireRoutingNumber"
                        value={payoutFormData.wireRoutingNumber}
                        onChange={(e) =>
                          updatePayoutFormData(
                            "wireRoutingNumber",
                            e.target.value
                          )
                        }
                        placeholder="123456789"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="wireAccountNumber"
                        className="text-sm font-medium text-gray-700"
                      >
                        Account Number *
                      </Label>
                      <Input
                        id="wireAccountNumber"
                        value={payoutFormData.wireAccountNumber}
                        onChange={(e) =>
                          updatePayoutFormData(
                            "wireAccountNumber",
                            e.target.value
                          )
                        }
                        placeholder="Account number"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="wireAccountHolderName"
                        className="text-sm font-medium text-gray-700"
                      >
                        Account Holder Name *
                      </Label>
                      <Input
                        id="wireAccountHolderName"
                        value={payoutFormData.wireAccountHolderName}
                        onChange={(e) =>
                          updatePayoutFormData(
                            "wireAccountHolderName",
                            e.target.value
                          )
                        }
                        placeholder="John Doe"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="wireAccountType"
                        className="text-sm font-medium text-gray-700"
                      >
                        Account Type *
                      </Label>
                      <Select
                        value={payoutFormData.wireAccountType}
                        onValueChange={(value: "checking" | "savings") =>
                          updatePayoutFormData("wireAccountType", value)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checking">Checking</SelectItem>
                          <SelectItem value="savings">Savings</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label
                        htmlFor="wireSwiftCode"
                        className="text-sm font-medium text-gray-700"
                      >
                        SWIFT Code (International)
                      </Label>
                      <Input
                        id="wireSwiftCode"
                        value={payoutFormData.wireSwiftCode}
                        onChange={(e) =>
                          updatePayoutFormData("wireSwiftCode", e.target.value)
                        }
                        placeholder="BOFAUS3N"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label
                      htmlFor="wireBankAddress"
                      className="text-sm font-medium text-gray-700"
                    >
                      Bank Address (Optional)
                    </Label>
                    <Textarea
                      id="wireBankAddress"
                      value={payoutFormData.wireBankAddress}
                      onChange={(e) =>
                        updatePayoutFormData("wireBankAddress", e.target.value)
                      }
                      placeholder="Bank's full address"
                      className="mt-1"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {payoutFormData.payoutMethod === "check" && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-lg text-orange-700 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Mailing Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label
                      htmlFor="checkFullName"
                      className="text-sm font-medium text-gray-700"
                    >
                      Full Name *
                    </Label>
                    <Input
                      id="checkFullName"
                      value={payoutFormData.checkFullName}
                      onChange={(e) =>
                        updatePayoutFormData("checkFullName", e.target.value)
                      }
                      placeholder="John Doe"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="checkAddressLine1"
                      className="text-sm font-medium text-gray-700"
                    >
                      Address Line 1 *
                    </Label>
                    <Input
                      id="checkAddressLine1"
                      value={payoutFormData.checkAddressLine1}
                      onChange={(e) =>
                        updatePayoutFormData(
                          "checkAddressLine1",
                          e.target.value
                        )
                      }
                      placeholder="123 Main Street"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="checkAddressLine2"
                      className="text-sm font-medium text-gray-700"
                    >
                      Address Line 2 (Optional)
                    </Label>
                    <Input
                      id="checkAddressLine2"
                      value={payoutFormData.checkAddressLine2}
                      onChange={(e) =>
                        updatePayoutFormData(
                          "checkAddressLine2",
                          e.target.value
                        )
                      }
                      placeholder="Apt 4B"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label
                        htmlFor="checkCity"
                        className="text-sm font-medium text-gray-700"
                      >
                        City *
                      </Label>
                      <Input
                        id="checkCity"
                        value={payoutFormData.checkCity}
                        onChange={(e) =>
                          updatePayoutFormData("checkCity", e.target.value)
                        }
                        placeholder="New York"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="checkState"
                        className="text-sm font-medium text-gray-700"
                      >
                        State *
                      </Label>
                      <Input
                        id="checkState"
                        value={payoutFormData.checkState}
                        onChange={(e) =>
                          updatePayoutFormData("checkState", e.target.value)
                        }
                        placeholder="NY"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="checkZipCode"
                        className="text-sm font-medium text-gray-700"
                      >
                        ZIP Code *
                      </Label>
                      <Input
                        id="checkZipCode"
                        value={payoutFormData.checkZipCode}
                        onChange={(e) =>
                          updatePayoutFormData("checkZipCode", e.target.value)
                        }
                        placeholder="10001"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label
                      htmlFor="checkCountry"
                      className="text-sm font-medium text-gray-700"
                    >
                      Country *
                    </Label>
                    <Input
                      id="checkCountry"
                      value={payoutFormData.checkCountry}
                      onChange={(e) =>
                        updatePayoutFormData("checkCountry", e.target.value)
                      }
                      placeholder="United States"
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Information Notice */}
            {payoutFormData.payoutMethod && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Important Information:</p>
                      <ul className="space-y-1 text-xs">
                        <li>
                          • Payouts are processed on the 1st and 15th of each
                          month
                        </li>
                        <li>• Processing times vary by payment method</li>
                        <li>
                          • Double-check all information before submitting
                        </li>
                        <li>
                          • Contact support if you need to update payout
                          information
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowPayoutForm(false);
                resetPayoutForm();
              }}
              disabled={submittingPayout}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayoutFormSubmit}
              disabled={!payoutFormData.payoutMethod || submittingPayout}
              className="bg-green-600 hover:bg-green-700"
            >
              {submittingPayout ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Submit Payout Request
                </div>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserEarningsTab;
