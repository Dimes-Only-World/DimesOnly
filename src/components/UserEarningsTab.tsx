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
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
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

interface EarningsItem {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  payment_type: string;
  payment_status: string | null;
  buyer_id: string | null;
  buyer_username: string | null;
  // Optional referred-user profile fields (if backend provides)
  buyer_avatar_url?: string | null;
  buyer_location?: string | null; // e.g. "Los Angeles, CA"
  buyer_joined_at?: string | null; // ISO date
  buyer_membership_tier: string | null;
  plan_tier: string | null;
  cadence: string | null;
  billing_option: string | null;
  subscription_id: string | null;
  source_label: string;
  override_badge: boolean;
  // New: show who directly referred the buyer (used for Upline commissions)
  referrer_username?: string | null;
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
  payoutMethod: "paypal" | "venmo" | "wire" | "direct_deposit" | "check" | "";
  // PayPal
  paypalEmail: string;
  // Venmo
  venmoUsername: string;
  venmoPhone: string;
  venmoEmail: string;
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
  // ACH extras (Direct Deposit)
  achTransactionCode: "22" | "32" | ""; // derived from account type: 22=checking, 32=savings
  achPayeeId: string; // up to 15 chars
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
  // Controlled tab for jumping between sections
  const [tabValue, setTabValue] = useState("weekly");
  const [totalYearlyEarnings, setTotalYearlyEarnings] = useState(0);
  const [availableForWithdrawal, setAvailableForWithdrawal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [payoutFormData, setPayoutFormData] = useState<PayoutFormData>({
    payoutMethod: "",
    paypalEmail: "",
    venmoUsername: "",
    venmoPhone: "",
    venmoEmail: "",
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
    achTransactionCode: "",
    achPayeeId: "",
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
  // Inline error for Supabase connectivity/auth so UI doesn't look blank
  const [supabaseError, setSupabaseError] = useState<string>("");

  // Earnings-query state (Referrals tab)
  const [earningsItems, setEarningsItems] = useState<EarningsItem[]>([]);
  const [earningsTotal, setEarningsTotal] = useState(0);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [q, setQ] = useState("");
  // Use a non-empty sentinel value for "All tiers" to avoid Radix Select error
  const [membershipType, setMembershipType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [commissionTypes, setCommissionTypes] = useState<string[]>([]); // empty -> server defaults

  // Dynamic membership tiers for dropdown (ensures completeness)
  const [tierOptions, setTierOptions] = useState<string[]>(["free", "silver_plus", "diamond_plus"]);
  const [tiersLoading, setTiersLoading] = useState<boolean>(false);


  const prettyTier = (t?: string | null) =>
    (t || "").split("_").join(" ").replace(/\b\w/g, (m) => m.toUpperCase());

  // Auto-apply filters with a small debounce to avoid requiring an explicit Apply click
  useEffect(() => {
    const handle = setTimeout(() => {
      // Reset to first page when filters change
      fetchReferralEarnings(1, pageSize);
    }, 300);
    return () => clearTimeout(handle);
    // Note: page is intentionally not included here; pagination is handled by Prev/Next buttons
  }, [membershipType, startDate, endDate, q, commissionTypes, pageSize]);

  // Helpers: commission-type toggles
  const toggleCommissionType = (t: string) => {
    setCommissionTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  // Static options for commission types (do not depend on current results)
  // Client request: Diamond Plus falls under Membership, so we present only two filters.
  const defaultCommissionOptions = ["subscription", "membership"] as const;

  // Map UI labels -> backend payment_type values expected by earnings-query
  const expandCommissionLabels = (labels: string[]): string[] => {
    const set = new Set<string>();
    for (const label of labels) {
      const l = label.toLowerCase();
      if (l === "subscription") {
        set.add("subscription_referral_commission");
        set.add("subscription_upline_referral_commission");
      } else if (l === "membership") {
        // Include both standard and Diamond Plus commissions under Membership
        set.add("referral_commission");
        set.add("upline_referral_commission");
        set.add("diamond_plus_referral_commission");
        set.add("diamond_plus_upline_referral_commission");
      } else {
        // Allow passing through exact payment_type values if provided
        set.add(label);
      }
    }
    return Array.from(set);
  };

  // Helpers: pay-period ranges (1–15, 16–end)
  const getCurrentPayPeriod = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    // Periods are 1–15 and 16–end of month (no overlap on the 15th)
    const start = new Date(y, m, d <= 15 ? 1 : 16);
    const end = new Date(y, m, d <= 15 ? 15 : new Date(y, m + 1, 0).getDate());
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  };

  const getPreviousPayPeriod = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    if (d <= 15) {
      // previous is 15th -> end of previous month
      const prevMonth = new Date(y, m - 1, 1);
      // Use 16th to end of previous month to avoid overlap with 1–15 current-month period
      const start = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 16);
      const end = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
      return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      };
    } else {
      // previous is 1st -> 15th of current month
      const start = new Date(y, m, 1);
      const end = new Date(y, m, 15);
      return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
      };
    }
  };

  // Quick apply pay periods
  const applyCurrentPayPeriod = () => {
    const { start, end } = getCurrentPayPeriod();
    setStartDate(start);
    setEndDate(end);
    fetchReferralEarnings(1, pageSize);
  };
  const applyPreviousPayPeriod = () => {
    const { start, end } = getPreviousPayPeriod();
    setStartDate(start);
    setEndDate(end);
    fetchReferralEarnings(1, pageSize);
  };
  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
    fetchReferralEarnings(1, pageSize);
  };

  // Pay-period objects for display and export
  const currentPeriod = getCurrentPayPeriod();
  const previousPeriod = getPreviousPayPeriod();

  // CSV export for a specific date range (ignores UI filters for full period export)
  const exportCsvForRange = async (start: string, end: string, name = "period") => {
    try {
      const params = new URLSearchParams();
      params.set("user_id", userData.id);
      params.set("start_date", start);
      params.set("end_date", end);
      params.set("page", "1");
      params.set("page_size", "10000");
      params.set("format", "csv");
      const url = `${SUPABASE_URL}/functions/v1/earnings-query?${params.toString()}`;
      const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
      if (!res.ok) throw new Error("CSV export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `earnings_${name}_${start}_${end}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "CSV export failed", variant: "destructive" });
    }
  };

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
      fetchReferralEarnings(1, pageSize);
    }
  }, [userData?.id]);

  // Load distinct membership tiers from users so all tiers show up
  useEffect(() => {
    const loadTiers = async () => {
      try {
        setTiersLoading(true);
        const { data, error } = await supabase
          .from("users")
          .select("membership_tier")
          .not("membership_tier", "is", null);
        if (error) throw error;
        const distinct = Array.from(
          new Set((data || []).map((r: any) => String(r.membership_tier || "").toLowerCase()).filter(Boolean))
        );
        const base = new Set(["free", "silver_plus", "diamond_plus"]);
        // Keep base tiers first, then any extra tiers alphabetically
        const extras = distinct.filter((t) => !base.has(t)).sort((a, b) => a.localeCompare(b));
        setTierOptions(["free", "silver_plus", "diamond_plus", ...extras]);
      } catch (e) {
        console.warn("tier load failed", e);
      } finally {
        setTiersLoading(false);
      }
    };
    loadTiers();
  }, []);

  const buildEarningsUrl = (p: number, ps: number, format: "json" | "csv" = "json") => {
    const params = new URLSearchParams();
    params.set("user_id", userData.id);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    if (q) params.set("q", q);
    if (membershipType && membershipType !== "all") params.set("membership_type", membershipType);
    if (commissionTypes.length > 0) {
      const expanded = expandCommissionLabels(commissionTypes);
      if (expanded.length > 0) params.set("commission_type", expanded.join(","));
    }
    params.set("page", String(p));
    params.set("page_size", String(ps));
    params.set("format", format);
    return `${SUPABASE_URL}/functions/v1/earnings-query?${params.toString()}`;
  };

  const fetchReferralEarnings = async (p = page, ps = pageSize) => {
    if (!userData?.id) return;
    try {
      setEarningsLoading(true);
      const url = buildEarningsUrl(p, ps, "json");
      const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
      if (!res.ok) throw new Error(`earnings-query failed: ${res.status}`);
      const body = await res.json();
      const items = (body.items || []) as EarningsItem[];
      setEarningsItems(items);
      setEarningsTotal(Number(body.total || items.length));
      setPage(p);
      setPageSize(ps);
      // Clear any prior connectivity/auth error on success
      if (supabaseError) setSupabaseError("");

      // Maintain backward-compatible state for existing summaries
      setReferralCommissions(
        items.map((r) => ({
          id: r.id,
          amount: r.amount,
          referrer_commission: r.amount,
          payment_type: r.payment_type,
          created_at: r.created_at,
          referred_by: "",
        }))
      );
    } catch (e) {
      console.error(e);
      setSupabaseError("Unable to load referral earnings due to a connection/auth issue. Please refresh or try again shortly.");
      toast({ title: "Error", description: "Failed to load referral earnings", variant: "destructive" });
    } finally {
      setEarningsLoading(false);
    }
  };

  const exportReferralCsv = async () => {
    try {
      const url = buildEarningsUrl(page, pageSize, "csv");
      const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
      if (!res.ok) throw new Error("CSV export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `earnings_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "CSV export failed", variant: "destructive" });
    }
  };

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
    } else if (error) {
      setSupabaseError("Could not load referral count due to a connection issue.");
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
      // Clear any prior connectivity/auth error on success
      if (supabaseError) setSupabaseError("");
    } catch (error) {
      console.error("Error fetching earnings:", error);
      setSupabaseError("We’re having trouble connecting to the earnings service. Your session may need a refresh. You can still use the filters below; data will appear once the connection resumes.");
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

      // Pre-compute ACH metadata (for direct_deposit)
      const achCode =
        payoutFormData.wireAccountType === "checking"
          ? "22"
          : payoutFormData.wireAccountType === "savings"
          ? "32"
          : "";
      const traceId =
        `${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 100000)
          .toString()
          .padStart(5, "0")}`; // 15 digits max

      // Sanitize ACH fields
      const achRouting = (payoutFormData.wireRoutingNumber || "").replace(/\D/g, "");
      const achAccount = (payoutFormData.wireAccountNumber || "").replace(/\D/g, "");
      const achPayeeName = (payoutFormData.wireAccountHolderName || "").trim().slice(0, 22);

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

          // Cash App removed; keep nulls
          cashapp_cashtag: null,
          cashapp_phone: null,
          cashapp_email: null,

          // Wire transfer fields
          wire_bank_name:
            (payoutFormData.payoutMethod === "wire" || payoutFormData.payoutMethod === "direct_deposit")
              ? payoutFormData.wireBankName
              : null,
          wire_routing_number:
            (payoutFormData.payoutMethod === "wire" || payoutFormData.payoutMethod === "direct_deposit")
              ? payoutFormData.wireRoutingNumber
              : null,
          wire_account_number:
            (payoutFormData.payoutMethod === "wire" || payoutFormData.payoutMethod === "direct_deposit")
              ? payoutFormData.wireAccountNumber
              : null,
          wire_account_holder_name:
            (payoutFormData.payoutMethod === "wire" || payoutFormData.payoutMethod === "direct_deposit")
              ? payoutFormData.wireAccountHolderName
              : null,
          wire_account_type:
            (payoutFormData.payoutMethod === "wire" || payoutFormData.payoutMethod === "direct_deposit")
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

          // Notes: store Venmo and ACH metadata
          notes:
            payoutFormData.payoutMethod === "venmo"
              ? JSON.stringify({
                  type: "venmo",
                  username: payoutFormData.venmoUsername || null,
                  phone: payoutFormData.venmoPhone || null,
                  email: payoutFormData.venmoEmail || null,
                })
              : payoutFormData.payoutMethod === "direct_deposit"
              ? JSON.stringify({
                  type: "ach",
                  transaction_code: achCode || null,
                  routing_number: achRouting,
                  account_number: achAccount,
                  payee_id: payoutFormData.achPayeeId || null,
                  payee_name: achPayeeName || null,
                  amount_cents: Math.round(availableForWithdrawal * 100),
                  trace_id: traceId,
                })
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
    } else if (payoutMethod === "venmo") {
      if (!payoutFormData.venmoUsername) {
        toast({
          title: "Missing Information",
          description: "Venmo username is required",
          variant: "destructive",
        });
        return false;
      }
    } else if (payoutMethod === "wire" || payoutMethod === "direct_deposit") {
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
          description: payoutMethod === 'wire' ? "All wire transfer fields are required" : "All direct deposit fields are required",
          variant: "destructive",
        });
        return false;
      }
      if (payoutMethod === "direct_deposit") {
        // Additional ACH requirements per client spec
        const routing = (payoutFormData.wireRoutingNumber || "").replace(/\D/g, "");
        const account = (payoutFormData.wireAccountNumber || "").replace(/\D/g, "");
        const payeeId = (payoutFormData.achPayeeId || "").replace(/[^a-zA-Z0-9]/g, "");
        const payeeName = (payoutFormData.wireAccountHolderName || "").trim();

        if (!/^\d{9}$/.test(routing)) {
          toast({ title: "Invalid Routing Number", description: "Routing number must be exactly 9 digits.", variant: "destructive" });
          return false;
        }
        if (!/^\d{1,17}$/.test(account)) {
          toast({ title: "Invalid Account Number", description: "Account number must be 1–17 digits.", variant: "destructive" });
          return false;
        }
        if (!/^[a-zA-Z0-9]{1,15}$/.test(payeeId)) {
          toast({ title: "Invalid Payee ID", description: "Payee ID must be alphanumeric and up to 15 characters.", variant: "destructive" });
          return false;
        }
        if (payeeName.length === 0 || payeeName.length > 22) {
          toast({ title: "Invalid Payee Name", description: "Payee Name is required and must be up to 22 characters.", variant: "destructive" });
          return false;
        }
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
      venmoUsername: "",
      venmoPhone: "",
      venmoEmail: "",
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
      achTransactionCode: "",
      achPayeeId: "",
    });
  };

  const updatePayoutFormData = (field: keyof PayoutFormData, value: string) => {
    let v = value;
    if (field === "wireRoutingNumber") {
      v = value.replace(/\D/g, "").slice(0, 9);
    } else if (field === "wireAccountNumber") {
      v = value.replace(/\D/g, "").slice(0, 17);
    } else if (field === "achPayeeId") {
      v = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15);
    } else if (field === "wireAccountHolderName") {
      v = value.slice(0, 22);
    }
    setPayoutFormData((prev) => ({ ...prev, [field]: v }));
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
    const recentReferrals = earningsItems.filter(
      (ref) => new Date(ref.created_at) >= cutoffDate
    );

    const tipsAmount = recentTips.reduce((sum, tip) => sum + tip.tip_amount, 0);
    const referralAmount = recentReferrals.reduce((sum, ref) => sum + (ref.amount || 0), 0);

    return tipsAmount + referralAmount;
  };

  // Derived filters and summaries for Referrals tab
  const commissionOptions = [...defaultCommissionOptions];
  const overridesTotal = earningsItems
    .filter((i) => i.override_badge)
    .reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalReferralAmount = earningsItems.reduce((sum, i) => sum + (i.amount || 0), 0);
  const directTotalAmount = earningsItems
    .filter((i) => !i.override_badge)
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  // DM dialog state (for messaging a buyer from referrals table)
  const [dmOpen, setDmOpen] = useState(false);
  const [dmRecipient, setDmRecipient] = useState<string>("");
  const [dmBody, setDmBody] = useState<string>("");

  const openDm = (username: string | null) => {
    setDmRecipient(username || "");
    setDmBody("");
    setDmOpen(true);
  };
  const sendDm = async () => {
    try {
      if (!dmRecipient || !dmBody.trim()) {
        toast({ title: "Message", description: "Enter a recipient and a message.", variant: "destructive" });
        return;
      }
      if (!user?.id) {
        toast({ title: "Sign in required", description: "Log in to send messages.", variant: "destructive" });
        return;
      }

      // Look up recipient by username
      const { data: recipientUser, error: recipientErr } = await supabase
        .from("users")
        .select("id, username")
        .ilike("username", dmRecipient)
        .single();
      if (recipientErr || !recipientUser?.id) {
        toast({ title: "User not found", description: `Could not find @${dmRecipient}.`, variant: "destructive" });
        return;
      }
      if (recipientUser.id === user.id) {
        toast({ title: "Cannot message yourself", description: "Choose a different recipient.", variant: "destructive" });
        return;
      }

      // Insert direct message
      const { error: dmErr } = await supabase.from("direct_messages").insert({
        sender_id: user.id,
        recipient_id: recipientUser.id,
        message: dmBody.trim(),
        is_read: false,
      });
      if (dmErr) throw dmErr;

      // Fetch current user's username for notification context
      const { data: currentUser, error: curErr } = await supabase
        .from("users")
        .select("username")
        .eq("id", user.id)
        .single();
      if (curErr) throw curErr;

      // Create notification for recipient
      const { error: notifErr } = await supabase.from("notifications").insert({
        recipient_id: recipientUser.id,
        title: "New Message",
        message: `You have a new message from ${currentUser?.username || "a user"}`,
        is_read: false,
      });
      if (notifErr) throw notifErr;

      toast({ title: "Message sent", description: `Your message to @${recipientUser.username} was sent.` });
      setDmOpen(false);
      setDmBody("");
    } catch (e) {
      console.error("sendDm error", e);
      toast({ title: "Error", description: "Failed to send message. Please try again.", variant: "destructive" });
    }
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
      <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
        <TabsList
          className={`grid grid-cols-2 sm:grid-cols-4 w-full gap-2 h-auto bg-gray-50 border border-gray-200 p-2 rounded-lg ${getContentClasses()}`}
        >
          <TabsTrigger
            value="weekly"
            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-800 border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
          >
            Pay Period History
          </TabsTrigger>
          <TabsTrigger
            value="tips"
            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-800 border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
          >
            Tips Received
          </TabsTrigger>
          <TabsTrigger
            value="referrals"
            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-800 border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
          >
            Referrals
          </TabsTrigger>
          <TabsTrigger
            value="jackpot"
            className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-800 border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
          >
            Jackpot
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Pay Earnings History
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
                      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          Pay period {new Date(earning.week_start).toLocaleDateString()} - {new Date(earning.week_end).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-500 hidden">
                          {new Date(earning.week_start).toLocaleDateString()} - {new Date(earning.week_end).toLocaleDateString()}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-600">
                          <span>
                            Tips: {formatCurrency(earning.tip_earnings || 0)}
                          </span>
                          <span>
                            Referrals: {formatCurrency(earning.referral_earnings || 0)}
                          </span>
                          <span>
                            Jackpot: {formatCurrency(earning.bonus_earnings || 0)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full sm:w-auto flex items-center justify-between gap-3">
                        <Button
                          variant="secondary"
                          className="bg-yellow-400 text-black hover:bg-yellow-300 shrink-0 text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2.5"
                          onClick={() => {
                            setStartDate(String(earning.week_start).slice(0,10));
                            setEndDate(String(earning.week_end).slice(0,10));
                            setTabValue("referrals");
                            fetchReferralEarnings(1, pageSize);
                          }}
                        >
                          View Referrals
                        </Button>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold">
                            {formatCurrency(earning.amount || 0)}
                          </p>
                          <Badge variant="default">Total</Badge>
                        </div>
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
                Referral Earnings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3">
              {/* Current Pay Period Label */}
              <div className="text-xs text-gray-600">Current pay period: {currentPeriod.start} – {currentPeriod.end}</div>

              {/* Connectivity/Auth Error Banner */}
              {supabaseError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 p-3 rounded-md border border-red-200 bg-red-50 text-red-800"
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 text-sm">
                    {supabaseError}
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSupabaseError("");
                      fetchReferralEarnings(1, pageSize);
                    }}
                  >
                    Retry
                  </Button>
                </div>
              )}

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-4 md:grid-cols-6 gap-2">
                <Input className="h-8 sm:h-9" placeholder="Search buyer username" value={q} onChange={(e) => setQ(e.target.value)} />
                <Select value={membershipType} onValueChange={setMembershipType}>
                  <SelectTrigger className="h-8 sm:h-9"><SelectValue placeholder="Membership tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tiers</SelectItem>
                    {tierOptions.map((t) => (
                      <SelectItem key={t} value={t}>{prettyTier(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input className="h-8 sm:h-9" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <Input className="h-8 sm:h-9" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-8 sm:h-9"><SelectValue placeholder="Page size" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Helper: filters auto-apply + clarification */}
              <div className="text-xs text-gray-600 mt-1">
                Filters update automatically. “Subscription” = recurring creator subscriptions. “Membership” = membership packages (includes Diamond Plus) and their overrides.
              </div>


              {/* Commission Types multi-select */}
              {commissionOptions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-gray-600">Commission types</div>
                  <div className="flex flex-wrap gap-2">
                    {commissionOptions.map((opt) => {
                      const active = commissionTypes.includes(opt);
                      return (
                        <Button
                          key={opt}
                          variant={active ? "default" : "outline"}
                          size="sm"
                          className="px-2"
                          onClick={() => toggleCommissionType(opt)}
                        >
                          {opt === "subscription" ? "Subscription" : "Membership"}
                        </Button>
                      );
                    })}
                    {commissionTypes.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCommissionTypes([])}
                      >
                        Clear types
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Pay-period quick filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs text-gray-600 mr-2">Pay period</div>
                <Button size="sm" variant="outline" onClick={applyCurrentPayPeriod}>Current period</Button>
                <Button size="sm" variant="outline" onClick={applyPreviousPayPeriod}>Previous period</Button>
                <Button size="sm" variant="ghost" onClick={clearDateFilters}>Clear dates</Button>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
                <div className="text-sm text-gray-600 flex items-center gap-3">
                  <span>Total: {earningsTotal}</span>
                  <span className="flex items-center gap-1">
                    <Badge variant="secondary">Sum</Badge>
                    <span className="font-medium">{formatCurrency(totalReferralAmount)}</span>
                  </span>
                  <span className="hidden sm:flex items-center gap-1">
                    <Badge variant="secondary">Direct</Badge>
                    <span className="font-medium">{formatCurrency(directTotalAmount)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Badge variant="secondary">Overrides</Badge>
                    <span className="font-medium text-green-700">{formatCurrency(overridesTotal)}</span>
                  </span>
                </div>
                <Button size="sm" onClick={exportReferralCsv}>
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
              </div>

              {/* Previous Pay Period - Downloadable */}
              <div className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2 mt-2">
                <div className="text-xs text-gray-600">
                  Previous pay period: {previousPeriod.start} – {previousPeriod.end}
                </div>
                <Button size="sm" variant="outline" onClick={() => exportCsvForRange(previousPeriod.start, previousPeriod.end, "previous_period")}>
                  <Download className="w-4 h-4 mr-2" /> Download CSV
                </Button>
              </div>

              {/* Current Pay Period - Downloadable */}
              <div className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2">
                <div className="text-xs text-gray-600">
                  Current pay period: {currentPeriod.start} – {currentPeriod.end}
                </div>
                <Button size="sm" variant="outline" onClick={() => exportCsvForRange(currentPeriod.start, currentPeriod.end, "current_period")}>
                  <Download className="w-4 h-4 mr-2" /> Download CSV
                </Button>
              </div>

              {/* Card list (client style) */}
              {earningsLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : earningsItems.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No referral earnings yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {earningsItems.map((row) => (
                    <div key={row.id} className="flex items-stretch justify-between gap-3 p-3 border rounded-xl bg-white">
                      {/* Left: avatar + info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-16 w-16 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                          {row.buyer_avatar_url ? (
                            <img src={row.buyer_avatar_url} alt={row.buyer_username || "avatar"} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                            <span>Tips: {formatCurrency(0)}</span>
                            <span>Referrals: {formatCurrency(row.amount || 0)}</span>
                            <span>Jackpot: {formatCurrency(0)}</span>
                          </div>
                          <div className="mt-1">
                            <p className="font-semibold truncate flex items-center gap-2">
                              {row.buyer_username || "User"}
                              {row.source_label === 'diamond_plus' ? (
                                <Badge variant="secondary">Jackpot</Badge>
                              ) : null}
                              {row.override_badge ? (
                                <Badge variant="outline">Override</Badge>
                              ) : null}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {(row.plan_tier || row.buyer_membership_tier)
                                ? `${(row.plan_tier || row.buyer_membership_tier || "").toUpperCase()}${row.cadence ? ` • ${row.cadence}` : ""}`
                                : "Membership"}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {row.buyer_location ? `${row.buyer_location}` : null}
                              {row.buyer_joined_at ? `${row.buyer_location ? " • " : ""}Joined: ${new Date(row.buyer_joined_at).toLocaleDateString()}` : null}
                            </p>
                            {row.override_badge && row.referrer_username ? (
                              <p className="text-xs text-gray-700"><span className="font-semibold">Referred by:</span> {row.referrer_username}</p>
                            ) : null}
                            {row.override_badge && (
                              <p className="text-xs text-gray-700"><span className="font-semibold">Overrides:</span> {formatCurrency(row.amount || 0)}</p>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge className="bg-purple-700 text-white">{(row.plan_tier || row.buyer_membership_tier || "").toUpperCase() || "PACKAGE"}</Badge>
                            <Badge variant="secondary" className={row.override_badge ? "bg-orange-100 text-orange-800 border-orange-200" : "bg-green-100 text-green-800 border-green-200"}>
                              {row.override_badge ? "Override" : "Direct"}
                            </Badge>
                          </div>
                          <div className="mt-2">
                            <Button className="bg-slate-900 text-white hover:bg-slate-800" size="sm" onClick={() => openDm(row.buyer_username)}>
                              <Mail className="w-4 h-4 mr-2" /> Send Message!
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Right: commission */}
                      <div className="ml-auto flex flex-col items-end justify-center">
                        <div className="text-lg font-semibold text-green-700">{formatCurrency(row.amount || 0)}</div>
                        <Badge variant="outline" className="mt-1">{row.override_badge ? "Override Commission" : "Direct Commission"}</Badge>
                        <div className="text-xs text-gray-500 mt-2">{new Date(row.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchReferralEarnings(page - 1, pageSize)}>Prev</Button>
                <div className="text-xs text-gray-600">Page {page}</div>
                <Button variant="outline" size="sm" disabled={(page * pageSize) >= earningsTotal} onClick={() => fetchReferralEarnings(page + 1, pageSize)}>Next</Button>
              </div>
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

      {/* Direct Message Dialog */}
      <Dialog open={dmOpen} onOpenChange={setDmOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Message {dmRecipient ? `@${dmRecipient}` : "user"}</DialogTitle>
            <DialogDescription>Send a quick message to this buyer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dmBody">Message</Label>
            <Textarea id="dmBody" value={dmBody} onChange={(e) => setDmBody(e.target.value)} rows={4} placeholder="Type your message..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDmOpen(false)}>Cancel</Button>
            <Button onClick={sendDm}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout Request Button */}
      {availableForWithdrawal > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Minimum Payout Start at $250.00</h3>
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
                Payout Method
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
                onValueChange={(value: "paypal" | "venmo" | "wire" | "direct_deposit" | "check") =>
                  updatePayoutFormData("payoutMethod", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose how you want to receive your funds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venmo">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Venmo (Instant)
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
                  <SelectItem value="direct_deposit">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      ACH Payment (Instant)
                    </div>
                  </SelectItem>
                  <SelectItem value="check">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Check by Mail (5-7 days) Jackpots only
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

            {payoutFormData.payoutMethod === "venmo" && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg text-green-700 flex items-center gap-2">
                    <Smartphone className="w-5 h-5" />
                    Venmo Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="venmoUsername" className="text-sm font-medium text-gray-700">
                      Venmo Username *
                    </Label>
                    <Input
                      id="venmoUsername"
                      value={payoutFormData.venmoUsername}
                      onChange={(e) => updatePayoutFormData("venmoUsername", e.target.value)}
                      placeholder="@your-venmo"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="venmoPhone" className="text-sm font-medium text-gray-700">
                        Phone (optional)
                      </Label>
                      <Input
                        id="venmoPhone"
                        value={payoutFormData.venmoPhone}
                        onChange={(e) => updatePayoutFormData("venmoPhone", e.target.value)}
                        placeholder="(555) 123-4567"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="venmoEmail" className="text-sm font-medium text-gray-700">
                        Email (optional)
                      </Label>
                      <Input
                        id="venmoEmail"
                        type="email"
                        value={payoutFormData.venmoEmail}
                        onChange={(e) => updatePayoutFormData("venmoEmail", e.target.value)}
                        placeholder="your-email@example.com"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {(payoutFormData.payoutMethod === "wire" || payoutFormData.payoutMethod === "direct_deposit") && (
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-lg text-purple-700 flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    {payoutFormData.payoutMethod === 'wire' ? 'Wire Transfer' : 'Direct Deposit (ACH)'} Information
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
