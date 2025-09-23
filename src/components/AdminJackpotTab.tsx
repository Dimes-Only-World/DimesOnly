import React, { useEffect, useMemo, useState } from "react";
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
import { Crown, Play, RefreshCw, CheckCircle, DollarSign, Loader2, List } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PoolRow = {
  pool_id: string;
  status: "open" | "ready" | "drawn" | "closed";
  total: number;
  period_start: string | null;
  period_end: string | null;
};

type WinnerRow = {
  draw_id: string;
  drawn_code: string;
  executed_at: string;
  user_id: string;
  role: "tipper" | "dime" | "referred_dime";
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

  const { toast } = useToast();
  const [forceCode, setForceCode] = useState("");

  // Recent codes dialog state
  const [pickOpen, setPickOpen] = useState(false);
  const [recentCodes, setRecentCodes] = useState<{ code: string; created_at: string }[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [filterUsername, setFilterUsername] = useState("");

  useEffect(() => {
    refreshAll();
  }, []);

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
  // 2) If empty, fallback: fetch latest open pool from jackpot_pools and compute total by counting tickets
  const fetchPool = async () => {
    try {
      // Try the view first (this is the primary source)
      const { data: viewRow, error: viewErr } = await supabase
        .from("v_jackpot_active_pool")
        .select("pool_id,status,total,period_start,period_end")
        .maybeSingle();

      if (!viewErr && viewRow) {
        setPool(viewRow as PoolRow);
        return;
      }

      // Fallback path if the view returns no rows for this session
      const { data: p, error: pErr } = await supabase
        .from("jackpot_pools")
        .select("id, status, period_start, period_end")
        .eq("status", "open")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pErr || !p) {
        setPool(null);
        return;
      }

      // Count tickets in this pool to compute a placeholder total (ticket count)
      const { count, error: cErr } = await supabase
        .from("jackpot_tickets")
        .select("id", { count: "exact", head: true })
        .eq("pool_id", p.id);

      if (cErr) {
        // If counting fails due to RLS, at least return the pool with 0 total
        setPool({
          pool_id: p.id,
          status: p.status,
          total: 0,
          period_start: p.period_start,
          period_end: p.period_end,
        } as any);
        return;
      }

      setPool({
        pool_id: p.id,
        status: p.status,
        total: Number(count || 0),
        period_start: p.period_start,
        period_end: p.period_end,
      } as any);
    } catch (e) {
      console.error("fetchPool error:", e);
      setPool(null);
    }
  };

  // Pull latest winners by picking the most recent draw_id from the view
  const fetchLatestWinners = async () => {
    const { data, error } = await supabase
      .from("v_jackpot_latest_winners")
      .select("draw_id,drawn_code,executed_at,user_id,role,place,percentage,amount,status")
      .order("executed_at", { ascending: false })
      .limit(50);
    if (error || !data) {
      setWinners([]);
      return;
    }
    // Group by draw_id, keep only rows for the latest executed_at
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

    // Fetch profiles for these winners
    const ids = Array.from(new Set(filteredWinners.map((r) => r.user_id).filter(Boolean)));
    if (ids.length > 0) {
      await loadProfiles(ids);
    }
  };

  const runDraw = async () => {
    setRunningDraw(true);
    try {
      const { data, error } = await supabase.rpc("api_jackpot_run_draw", {
        p_now: new Date().toISOString(),
      });
      if (error) {
        toast({ title: "Draw failed", description: error.message, variant: "destructive" });
        throw error;
      }
      toast({ title: "Draw completed", description: "Weekly draw executed successfully." });
      await refreshAll();
    } catch (e: any) {
      console.error(e);
    } finally {
      setRunningDraw(false);
    }
  };

  const runForcedDraw = async () => {
    const code = (forceCode || "").trim().toUpperCase();
    if (!/^[A-Z]{5}$/.test(code)) {
      toast({ title: "Invalid code", description: "Enter a 5-letter code (A–Z).", variant: "destructive" });
      return;
    }
    setRunningDraw(true);
    try {
      const { data, error } = await supabase.rpc("api_jackpot_run_draw_force", {
        p_force_code: code,
        p_now: new Date().toISOString(),
      });
      if (error) {
        toast({ title: "Forced draw failed", description: error.message, variant: "destructive" });
        throw error;
      }
      toast({ title: "Forced draw completed", description: `Draw executed with code ${code}.` });
      await refreshAll();
    } catch (e: any) {
      console.error(e);
    } finally {
      setRunningDraw(false);
    }
  };

  const runRolloverNow = async () => {
    setRunningDraw(true);
    try {
      const { data, error } = await supabase.rpc("api_jackpot_close_and_open", {
        p_now: new Date().toISOString(),
      });
      const res = (data || {}) as { ok?: boolean; error?: string; carried_rollover?: number };
      if (error || !res?.ok) {
        const msg = error?.message || res?.error || "Rollover failed";
        toast({ title: "Rollover failed", description: msg, variant: "destructive" });
        throw error || new Error(msg);
      }
      toast({
        title: "Pool advanced",
        description: `Closed current pool and opened next (carried: $${Number(res.carried_rollover || 0).toFixed(2)})`,
      });
      await refreshAll();
    } catch (e: any) {
      console.error(e);
    } finally {
      setRunningDraw(false);
    }
  };

  const updateWinnerStatus = async (draw_id: string, user_id: string, status: "approved" | "paid") => {
    setUpdatingId(`${draw_id}:${user_id}:${status}`);
    try {
      const { error } = await supabase
        .from("jackpot_winners")
        .update({ status })
        .match({ draw_id, user_id });
      if (error) throw error;
      await fetchLatestWinners();
    } finally {
      setUpdatingId(null);
    }
  };

  const formatMoney = (n?: number | null) =>
    Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Helper: build a display name from user profile columns (matches your schema)
  const buildDisplayName = (u: any) => {
    return u?.username || "";
  };

  // Load user profiles for winners
  const loadProfiles = async (ids: string[]) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, first_name, last_name, profile_photo")
        .in("id", ids);
      if (error) throw error;

      const map: Record<string, { name: string; avatar_url?: string | null }> = {};
      (data || []).forEach((u: any) => {
        map[u.id] = { name: buildDisplayName(u) || u.id, avatar_url: u.profile_photo ?? null };
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

  // Load recent codes for the active pool (latest 50) with optional username filter
  const openPickCodes = async () => {
    if (!pool?.pool_id) {
      toast({ title: "No active pool", description: "Open pool not found.", variant: "destructive" });
      return;
    }
    setPickOpen(true);
    await loadRecentCodes(); // initial load without filter
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
        tipperId = userRow?.id || null;
        if (!tipperId) {
          setRecentCodes([]);
          setLoadingCodes(false);
          toast({ title: "No results", description: `No user found for username "${uname}"`, variant: "destructive" });
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
      setRecentCodes((data || []) as any);
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

  const pickThisCode = (c: string) => {
    setForceCode(c.toUpperCase());
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
                <Badge variant="outline">{pool?.status?.toUpperCase() || "—"}</Badge>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Total</div>
              <div className="text-2xl font-bold">${formatMoney(pool?.total)}</div>
            </div>

            {/* Actions */}
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Input
                  value={forceCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForceCode(e.target.value.toUpperCase())
                  }
                  placeholder="Force code (ABCDE)"
                  className="w-36"
                  maxLength={5}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={openPickCodes}
                  disabled={runningDraw || !pool?.pool_id}
                >
                  <List className="w-4 h-4 mr-2" />
                  Pick Code
                </Button>
                <Button
                  variant="secondary"
                  disabled={runningDraw || !/^[A-Z]{5}$/.test(forceCode || "")}
                  onClick={runForcedDraw}
                >
                  {runningDraw ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Force Draw
                </Button>
              </div>

              <Button variant="outline" onClick={refreshAll} disabled={loading || runningDraw}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Refresh
              </Button>
              <Button onClick={runDraw} disabled={runningDraw} variant="default">
                {runningDraw ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Run Draw
              </Button>
              <Button
                variant="outline"
                onClick={runRolloverNow}
                disabled={runningDraw}
                title="Close current pool and open the next week (carries rollover)"
              >
                {runningDraw ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Close & Open Next
              </Button>
            </div>
          </div>

          {latestDrawInfo && (
            <div className="mt-4 text-sm text-gray-600">
              Last draw candidate (from winners list): <span className="font-medium">{latestDrawInfo.code}</span> at{" "}
              {new Date(latestDrawInfo.executed_at).toLocaleString()}
            </div>
          )}
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
                              {(displayNameFor(w.user_id, w.user_id)?.[0] || "U").toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{displayNameFor(w.user_id, w.user_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium capitalize">{w.role}</TableCell>
                      <TableCell>{w.place}</TableCell>
                      <TableCell>${formatMoney(w.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={w.status === "paid" ? "default" : "outline"}>{w.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={w.status !== "pending" || approving}
                          onClick={() => updateWinnerStatus(w.draw_id, w.user_id, "approved")}
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
                          onClick={() => updateWinnerStatus(w.draw_id, w.user_id, "paid")}
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
              Codes from the active pool (latest first). Filter by username to narrow results.
            </DialogDescription>
          </DialogHeader>

          {/* Filter row */}
          <div className="flex items-center gap-2 mb-3">
            <Input
              placeholder="Filter by username (optional)"
              value={filterUsername}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterUsername(e.target.value)}
              className="flex-1"
            />
            <Button onClick={loadRecentCodes} disabled={loadingCodes || !pool?.pool_id}>
              {loadingCodes ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
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

          <div className="mt-4 text-xs text-gray-500">Pool: {pool?.pool_id || "—"}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminJackpotTab;