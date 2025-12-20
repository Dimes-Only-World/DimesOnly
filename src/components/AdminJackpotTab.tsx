import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getAdminUserId } from "@/lib/adminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Crown,
  Play,
  RefreshCw,
  CheckCircle,
  DollarSign,
  Loader2,
  List,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PoolRow = {
  pool_id: string;
  status: "open" | "sold_out" | "ready" | "drawn" | "closed";
  total: number;
  period_start: string | null;
  period_end: string | null;
  max_tickets: number | null;
  sold_out_at: string | null;
  sales_resume_at: string | null;
  guaranteed_draw: boolean | null;
};

type WinnerRow = {
  draw_id: string;
  drawn_code: string;
  executed_at: string;
  user_id: string;
  role: "tipper" | "dime" | "referred_dime" | "dime_referred_dime" | "referred_dime_referrer" | "who_referred_tipper";
  place: 1 | 2 | 3;
  percentage: number | null;
  amount: number | null;
  status: "pending" | "approved" | "paid" | "void";
};

const AdminJackpotTab: React.FC = () => {
  const [pool, setPool] = useState<PoolRow | null>(null);
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [userProfiles, setUserProfiles] = useState<
    Record<string, { name: string; avatar_url?: string | null }>
  >({});
  const [loading, setLoading] = useState(false);
  const [runningDraw, setRunningDraw] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [maxTicketsInput, setMaxTicketsInput] = useState("");
  const [updatingMaxTickets, setUpdatingMaxTickets] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const { toast } = useToast();
  
  // Double-entry verification state
  const [entryStep, setEntryStep] = useState<'enter' | 'confirm' | 'ready'>('enter');
  const [firstCode, setFirstCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [codeError, setCodeError] = useState("");

  // Recent codes dialog state
  const [pickOpen, setPickOpen] = useState(false);
  const [recentCodes, setRecentCodes] = useState<
    { code: string; created_at: string }[]
  >([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [filterUsername, setFilterUsername] = useState("");

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!pool) {
      setMaxTicketsInput("");
      return;
    }
    const value = pool.max_tickets;
    setMaxTicketsInput(
      value === null || value === undefined ? "" : String(value)
    );
  }, [pool?.pool_id, pool?.max_tickets]);

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPool(), fetchLatestWinners()]);
    } finally {
      setLoading(false);
    }
  };

  // Resilient pool fetch:
  // 1) Try the view v_jackpot_active_pool via maybeSingle()
  // 2) If empty, fallback: fetch latest open/sold_out pool from jackpot_pools and compute total
  const fetchPool = async () => {
    try {
      const { data: viewRow, error: viewErr } = await supabase
        .from("v_jackpot_active_pool")
        .select(
          "pool_id,status,total,period_start,period_end,max_tickets,sold_out_at,sales_resume_at,guaranteed_draw"
        )
        .maybeSingle();

      if (!viewErr && viewRow) {
        setPool(viewRow as PoolRow);
        return;
      }

      const { data: rawPool, error: pErr } = await supabase
        .from("jackpot_pools")
        .select(
          "id, status, period_start, period_end, max_tickets, sold_out_at, sales_resume_at, guaranteed_draw"
        )
        .in("status", ["open", "sold_out"])
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      type RawPool = {
        id: string;
        status: string | null;
        period_start: string | null;
        period_end: string | null;
        max_tickets: number | null;
        sold_out_at: string | null;
        sales_resume_at: string | null;
        guaranteed_draw: boolean | null;
      };

      const poolRow = (rawPool ?? null) as RawPool | null;

      if (pErr || !poolRow) {
        setPool(null);
        return;
      }

      const { count, error: cErr } = await supabase
        .from("jackpot_tickets")
        .select("id", { count: "exact", head: true })
        .eq("pool_id", poolRow.id);

      if (cErr) {
        setPool({
          pool_id: poolRow.id,
          status: (poolRow.status ?? "open") as PoolRow["status"],
          total: 0,
          period_start: poolRow.period_start,
          period_end: poolRow.period_end,
          max_tickets: poolRow.max_tickets ?? null,
          sold_out_at: poolRow.sold_out_at ?? null,
          sales_resume_at: poolRow.sales_resume_at ?? null,
          guaranteed_draw: poolRow.guaranteed_draw ?? null,
        });
        return;
      }

      setPool({
        pool_id: poolRow.id,
        status: (poolRow.status ?? "open") as PoolRow["status"],
        total: Number(count || 0),
        period_start: poolRow.period_start,
        period_end: poolRow.period_end,
        max_tickets: poolRow.max_tickets ?? null,
        sold_out_at: poolRow.sold_out_at ?? null,
        sales_resume_at: poolRow.sales_resume_at ?? null,
        guaranteed_draw: poolRow.guaranteed_draw ?? null,
      });
    } catch (e) {
      console.error("fetchPool error:", e);
      setPool(null);
    }
  };

  const fetchLatestWinners = async () => {
    const { data, error } = await supabase
      .from("v_jackpot_latest_winners")
      .select(
        "draw_id,drawn_code,executed_at,user_id,role,place,percentage,amount,status"
      )
      .order("executed_at", { ascending: false })
      .limit(50);

    if (error || !data) {
      setWinners([]);
      return;
    }

    const latest = (data as WinnerRow[]).sort(
      (a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()
    );
    if (latest.length === 0) {
      setWinners([]);
      return;
    }

    const latestDrawId = latest[0].draw_id;
    const filteredWinners = latest.filter((w) => w.draw_id === latestDrawId);
    setWinners(filteredWinners);

    const ids = Array.from(
      new Set(filteredWinners.map((r) => r.user_id).filter(Boolean))
    );
    if (ids.length > 0) {
      await loadProfiles(ids);
    }
  };

  const handleSaveMaxTickets = async () => {
    if (!pool?.pool_id) return;
    const trimmed = maxTicketsInput.trim();
    const parsed = trimmed.length === 0 ? null : Number.parseInt(trimmed, 10);
  
    if (trimmed.length > 0 && (parsed === null || Number.isNaN(parsed) || parsed <= 0)) {
      toast({
        title: "Invalid value",
        description: "Enter a positive whole number or leave blank to clear.",
        variant: "destructive",
      });
      return;
    }
  
    setUpdatingMaxTickets(true);
    try {
      const adminUserId = getAdminUserId();
      const { data: countResponse, error: countError } = await supabase.functions.invoke('admin-data', {
        body: { action: 'getPoolTicketCount', poolId: pool.pool_id, adminUserId }
      });
      if (countError || countResponse?.error) throw countError || new Error(countResponse?.error);
      const currentTickets = Number(countResponse?.data?.count ?? 0);
  

      if (parsed !== null && parsed < currentTickets) {
        toast({
          title: "Cap too low",
          description: `There are already ${currentTickets.toLocaleString()} tickets sold. Set the cap to at least that many or clear it.`,
          variant: "destructive",
        });
        return;
      }
  
      const { data: updateRes, error } = await supabase.functions.invoke('admin-data', {
        body: { action: 'updateMaxTickets', poolId: pool.pool_id, maxTickets: parsed, adminUserId }
      });
      if (error || updateRes?.error) throw error || new Error(updateRes?.error);
  
      toast({
        title: "Max tickets updated",
        description:
          parsed === null
            ? "Cap cleared; pool will not limit tickets."
            : `Cap set to ${parsed.toLocaleString()}.`,
      });
  
      const capAllowsMore = parsed === null || parsed > currentTickets;
  
      if (pool.status === "sold_out" && capAllowsMore) {
        const { data: reopenRes, error: reopenError } = await supabase.functions.invoke('admin-data', {
          body: { 
            action: 'updatePoolStatus', 
            poolId: pool.pool_id, 
            status: 'open',
            soldOutAt: null,
            salesResumeAt: null,
            guaranteedDraw: false,
            adminUserId
          }
        });
  
        if (reopenError || reopenRes?.error) {
          console.error("Failed to reopen pool after cap change:", reopenError || reopenRes?.error);
          toast({
            title: "Cap updated, but reopen failed",
            description: (reopenError || reopenRes?.error)?.message ?? "Pool is still marked sold out.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Pool reopened",
            description: "Cap raised above ticket total; sales resumed automatically.",
          });
        }
      } else if (parsed !== null && parsed === currentTickets && pool.status !== "sold_out") {
        const { data: soldRes, error: soldOutError } = await supabase.functions.invoke('admin-data', {
          body: { 
            action: 'updatePoolStatus', 
            poolId: pool.pool_id, 
            status: 'sold_out',
            soldOutAt: new Date().toISOString(),
            salesResumeAt: null,
            guaranteedDraw: true,
            adminUserId
          }
        });
        if (soldOutError || soldRes?.error) {
          console.error("Failed to mark pool sold out:", soldOutError || soldRes?.error);
          toast({
            title: "Cap saved, but sold-out update failed",
            description: (soldOutError || soldRes?.error)?.message ?? "Pool is still marked open.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Pool marked sold out",
            description: "Cap equals tickets sold; sales closed automatically.",
          });
        }
      }

      await fetchPool();
    } catch (err: unknown) {
      console.error(err);
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Could not update max tickets.",
        variant: "destructive",
      });
    } finally {
      setUpdatingMaxTickets(false);
    }
  };

  const handleResumeSales = async () => {
    if (!pool?.pool_id) return;
    setUpdatingStatus(true);
    try {
      const adminUserId = getAdminUserId();
      const { data: res, error } = await supabase.functions.invoke('admin-data', {
        body: { 
          action: 'updatePoolStatus', 
          poolId: pool.pool_id, 
          status: 'open',
          soldOutAt: null,
          salesResumeAt: null,
          guaranteedDraw: false,
          adminUserId
        }
      });
      if (error || res?.error) throw error || new Error(res?.error);
  
      toast({
        title: "Pool reopened",
        description: "Ticket sales resumed for the current pool.",
      });
      await fetchPool();
    } catch (err: unknown) {
      console.error(err);
      toast({
        title: "Could not resume sales",
        description: err instanceof Error ? err.message : "Retry or check the logs.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle first code entry - when 5 chars entered, mask and move to confirm step
  const handleFirstCodeChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5);
    setFirstCode(cleaned);
    setCodeError("");
    
    if (cleaned.length === 5) {
      // Move to confirm step after a brief delay to show the full code
      setTimeout(() => {
        setEntryStep('confirm');
      }, 300);
    }
  };

  // Handle confirm code entry - validate when 5 chars entered
  const handleConfirmCodeChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5);
    setConfirmCode(cleaned);
    setCodeError("");
    
    if (cleaned.length === 5) {
      // Validate codes match
      if (cleaned === firstCode) {
        setEntryStep('ready');
        setCodeError("");
      } else {
        // Codes don't match - reset everything
        setCodeError("Codes do not match - please try again");
        setTimeout(() => {
          setFirstCode("");
          setConfirmCode("");
          setEntryStep('enter');
          setCodeError("");
        }, 1500);
      }
    }
  };

  // Reset the code entry workflow
  const resetCodeEntry = () => {
    setFirstCode("");
    setConfirmCode("");
    setEntryStep('enter');
    setCodeError("");
  };

  const runVerifiedDraw = async () => {
    if (entryStep !== 'ready' || firstCode !== confirmCode) {
      toast({
        title: "Invalid state",
        description: "Please complete code verification first.",
        variant: "destructive",
      });
      return;
    }
    
    const code = firstCode.toUpperCase();
    setRunningDraw(true);
    try {
      const { data, error } = await supabase.rpc("api_jackpot_run_draw_force", {
        p_force_code: code,
        p_now: new Date().toISOString(),
      });
      if (error) {
        toast({
          title: "Draw failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      
      const result = data as { ok?: boolean; had_winner?: boolean; message?: string } | null;
      
      if (result?.had_winner) {
        toast({
          title: "Winner found!",
          description: `Draw completed with code ${code}. Winners have been recorded.`,
        });
      } else {
        toast({
          title: "No winner - Rolled over",
          description: `No matching ticket for ${code}. All tickets and pool rolled over to next week.`,
        });
      }
      
      // Reset code entry after successful draw
      resetCodeEntry();
      await refreshAll();
    } catch (e: any) {
      console.error(e);
    } finally {
      setRunningDraw(false);
    }
  };

  const updateWinnerStatus = async (
    draw_id: string,
    user_id: string,
    status: "approved" | "paid",
  ) => {
    setUpdatingId(`${draw_id}:${user_id}:${status}`);
    try {
      const adminUserId = getAdminUserId();
      const { data: res, error } = await supabase.functions.invoke('admin-data', {
        body: { action: 'updateWinnerStatus', drawId: draw_id, visitorId: user_id, status, adminUserId }
      });
      if (error || res?.error) throw error || new Error(res?.error);
      await fetchLatestWinners();
    } finally {
      setUpdatingId(null);
    }
  };

  const formatMoney = (n?: number | null) =>
    Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const buildDisplayName = (u: any) => {
    return u?.username || "";
  };

  const loadProfiles = async (ids: string[]) => {
    try {
      const { data, error } = await supabase
        .from("public_user_profiles")
        .select("id, username, profile_photo")
        .in("id", ids);
      if (error) throw error;

      const map: Record<string, { name: string; avatar_url?: string | null }> =
        {};
      (data || []).forEach((u: any) => {
        map[u.id] = {
          name: u.username || u.id,
          avatar_url: u.profile_photo ?? null,
        };
      });

      setUserProfiles((prev) => ({ ...prev, ...map }));
    } catch (err) {
      console.error("Error loading user profiles:", err);
    }
  };

  const latestDrawInfo = useMemo(() => {
    if (!winners.length) return null;
    const any = winners[0];
    return {
      draw_id: any.draw_id,
      code: any.drawn_code,
      executed_at: any.executed_at,
    };
  }, [winners]);

  const displayNameFor = (userId: string, fallback: string) => {
    const name = userProfiles[userId]?.name;
    if (name && name.trim().length > 0) return name;
    return fallback;
  };

  const openPickCodes = async () => {
    if (!pool?.pool_id) {
      toast({
        title: "No active pool",
        description: "Open pool not found.",
        variant: "destructive",
      });
      return;
    }
    setPickOpen(true);
    await loadRecentCodes();
  };

  const loadRecentCodes = async () => {
    if (!pool?.pool_id) return;
    setLoadingCodes(true);
    try {
      let tipperId: string | null = null;
      const uname = (filterUsername || "").trim();
      if (uname.length > 0) {
        const { data: userRow, error: uErr } = await supabase
          .from("users")
          .select("id")
          .eq("username", uname)
          .maybeSingle();
        if (uErr) throw uErr;
        tipperId = userRow?.id ? String(userRow.id) : null;
        if (!tipperId) {
          setRecentCodes([]);
          setLoadingCodes(false);
          toast({
            title: "No results",
            description: `No user found for username "${uname}"`,
            variant: "destructive",
          });
          return;
        }
      }
  
      let q = supabase
        .from("jackpot_tickets")
        .select("code, created_at")
        .eq("pool_id", pool.pool_id)
        .order("created_at", { ascending: false })
        .limit(50);
  
      if (tipperId) q = q.eq("tipper_id", tipperId);
  
      const { data, error } = await q;
      if (error) throw error;
  
      const rows =
        (data ?? []) as { code: string | null; created_at: string | null }[];
  
      setRecentCodes(
        rows
          .filter((row) => !!row.code)
          .map((row) => ({
            code: row.code as string,
            created_at: row.created_at,
          }))
      );
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Load codes failed",
        description: e?.message || "Could not load recent codes.",
        variant: "destructive",
      });
      setRecentCodes([]);
    } finally {
      setLoadingCodes(false);
    }
  };
  
  const pickThisCode = (value: string) => {
    const code = value.toUpperCase();
    setFirstCode(code);
    setConfirmCode(code);
    setEntryStep('ready');
    setCodeError("");
    setPickOpen(false);
  };
  
  return (
    <div className="space-y-6">
      {/* Pool Summary + Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-600" />
            Jackpot Pool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="text-xl font-semibold">
                <Badge
                  variant={
                    pool?.status === "sold_out" ? "destructive" : "outline"
                  }
                >
                  {pool?.status?.toUpperCase() || "—"}
                </Badge>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-2xl font-bold">${formatMoney(pool?.total)}</div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Max Tickets</div>
              <div className="text-xl font-semibold">
                {pool?.max_tickets ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Sold Out At</div>
              <div className="text-sm">
                {pool?.sold_out_at
                  ? new Date(pool.sold_out_at).toLocaleString()
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Sales Resume</div>
              <div className="text-sm">
                {pool?.sales_resume_at
                  ? new Date(pool.sales_resume_at).toLocaleString()
                  : "—"}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Input
                value={maxTicketsInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMaxTicketsInput(e.target.value.replace(/\D/g, ""))
                }
                placeholder="Weekly max tickets"
                className="w-40"
              />
              <Button
                variant="default"
                disabled={updatingMaxTickets || !pool?.pool_id}
                onClick={handleSaveMaxTickets}
              >
                {updatingMaxTickets ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Save Cap
              </Button>
              {pool?.status === "sold_out" && (
                <Button
                  variant="outline"
                  disabled={updatingStatus}
                  onClick={handleResumeSales}
                >
                  {updatingStatus ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Reopen Sales
                </Button>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Double-Entry Verification Draw Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-green-600" />
            Weekly Draw - Double Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Step 1: Enter Code */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={entryStep === 'enter' ? 'default' : 'secondary'}>
                  Step 1
                </Badge>
                <span className="text-sm font-medium">Enter Winning Code</span>
              </div>
              <div className="flex items-center gap-2">
                {entryStep === 'enter' ? (
                  <Input
                    value={firstCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleFirstCodeChange(e.target.value)
                    }
                    placeholder="Enter 5-letter code (A-Z)"
                    className="w-48 font-mono text-lg tracking-widest uppercase"
                    maxLength={5}
                    disabled={runningDraw}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-48 h-10 px-3 py-2 border rounded-md bg-muted flex items-center">
                      <span className="font-mono text-lg tracking-widest text-muted-foreground">
                        •••••
                      </span>
                    </div>
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Hidden for verification</span>
                  </div>
                )}
                {entryStep === 'enter' && firstCode.length > 0 && firstCode.length < 5 && (
                  <span className="text-xs text-muted-foreground">
                    {5 - firstCode.length} more letters needed
                  </span>
                )}
              </div>
            </div>

            {/* Step 2: Confirm Code */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={entryStep === 'confirm' ? 'default' : 'secondary'}>
                  Step 2
                </Badge>
                <span className="text-sm font-medium">Confirm Code</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={confirmCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleConfirmCodeChange(e.target.value)
                  }
                  placeholder={entryStep === 'enter' ? "Complete Step 1 first" : "Re-enter the code to confirm"}
                  className="w-48 font-mono text-lg tracking-widest uppercase"
                  maxLength={5}
                  disabled={entryStep === 'enter' || entryStep === 'ready' || runningDraw}
                />
                <Eye className="w-4 h-4 text-muted-foreground" />
                {entryStep === 'confirm' && confirmCode.length > 0 && confirmCode.length < 5 && (
                  <span className="text-xs text-muted-foreground">
                    {5 - confirmCode.length} more letters needed
                  </span>
                )}
              </div>
            </div>

            {/* Status Messages */}
            {codeError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <span className="text-sm text-destructive font-medium">❌ {codeError}</span>
              </div>
            )}
            
            {entryStep === 'ready' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md dark:bg-green-950 dark:border-green-800">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                  Codes match! Ready to run draw with code: <span className="font-mono font-bold">{firstCode}</span>
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="default"
                size="lg"
                disabled={entryStep !== 'ready' || runningDraw}
                onClick={runVerifiedDraw}
                className="min-w-[200px]"
              >
                {runningDraw ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {entryStep === 'ready' ? `Run Draw with ${firstCode}` : 'Run Draw'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={openPickCodes}
                disabled={runningDraw || !pool?.pool_id}
              >
                <List className="w-4 h-4 mr-2" />
                Pick from List
              </Button>

              <Button
                variant="ghost"
                onClick={resetCodeEntry}
                disabled={runningDraw || (entryStep === 'enter' && firstCode.length === 0)}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>

              <Button
                variant="outline"
                onClick={refreshAll}
                disabled={loading || runningDraw}
                className="ml-auto"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>

            {/* Info */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <p><strong>How it works:</strong> Enter the winning code in Step 1 (it will be hidden), then re-enter in Step 2 to confirm. If codes don't match, you'll need to start over.</p>
              <p className="mt-1"><strong>No winner?</strong> All tickets and the pool will automatically roll over to next Saturday's draw.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Winners (latest draw) */}
      <Card>
        <CardHeader>
          <CardTitle>Latest Draw Winners</CardTitle>
        </CardHeader>
        <CardContent>
          {winners.length === 0 ? (
            <div className="text-gray-500">No winners yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Place</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {winners.map((w) => {
                  const key = `${w.draw_id}:${w.user_id}`;
                  const approving = updatingId === `${key}:approved`;
                  const paying = updatingId === `${key}:paid`;
                  return (
                    <TableRow key={key}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            {userProfiles[w.user_id]?.avatar_url ? (
                              <AvatarImage
                                src={userProfiles[w.user_id].avatar_url}
                                alt={displayNameFor(w.user_id, w.user_id)}
                              />
                            ) : null}
                            <AvatarFallback className="text-xs">
                              {(displayNameFor(w.user_id, w.user_id)?.[0] ||
                                "U"
                              ).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {displayNameFor(w.user_id, w.user_id)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium capitalize">
                        {w.role}
                      </TableCell>
                      <TableCell>{w.place}</TableCell>
                      <TableCell>${formatMoney(w.amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={w.status === "paid" ? "default" : "outline"}
                        >
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={w.status !== "pending" || approving}
                          onClick={() =>
                            updateWinnerStatus(w.draw_id, w.user_id, "approved")
                          }
                        >
                          {approving ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-1" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          disabled={!(w.status === "approved") || paying}
                          onClick={() =>
                            updateWinnerStatus(w.draw_id, w.user_id, "paid")
                          }
                        >
                          {paying ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <DollarSign className="w-4 h-4 mr-1" />
                          )}
                          Mark Paid
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pick Code Dialog */}
      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pick a recent code</DialogTitle>
            <DialogDescription>
              Codes from the active pool (latest first). Filter by username to
              narrow results.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-3">
            <Input
              placeholder="Filter by username (optional)"
              value={filterUsername}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFilterUsername(e.target.value)
              }
              className="flex-1"
            />
            <Button onClick={loadRecentCodes} disabled={loadingCodes || !pool?.pool_id}>
              {loadingCodes ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Load
            </Button>
          </div>

          <div className="mt-2">
            {loadingCodes ? (
              <div className="flex items-center gap-2 text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading codes...
              </div>
            ) : recentCodes.length === 0 ? (
              <div className="text-gray-500">No recent codes found.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {recentCodes.map((r, idx) => (
                  <Button
                    key={`${r.code}-${idx}`}
                    size="sm"
                    variant="secondary"
                    onClick={() => pickThisCode(r.code)}
                    title={new Date(r.created_at).toLocaleString()}
                  >
                    {r.code}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Pool: {pool?.pool_id || "—"}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminJackpotTab;