import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Search, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";

interface Referral {
  id: string;
  username: string;
  profile_photo: string | null;
  created_at: string;
  city?: string | null;
  state?: string | null;
}

interface DashboardMoneyCircleProps {
  userId: string;
  onViewAll?: () => void;
  onGetLink: () => void;
}

const PAGE_SIZE = 50;

const readStoredUsername = () => {
  if (typeof window === "undefined") return "";
  const savedUser = sessionStorage.getItem("userData");
  if (!savedUser) return sessionStorage.getItem("currentUser") || "";
  try {
    const parsed = JSON.parse(savedUser);
    return String(parsed?.username || sessionStorage.getItem("currentUser") || "");
  } catch {
    return sessionStorage.getItem("currentUser") || "";
  }
};

const DashboardMoneyCircle: React.FC<DashboardMoneyCircleProps> = ({
  userId,
  onGetLink,
}) => {
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [filterUsername, setFilterUsername] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterState, setFilterState] = useState("");
  const [page, setPage] = useState(1);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const onlineUsers = useOnlinePresence(true);


  const fetchReferrals = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!userId) {
        setReferrals([]);
        setLoading(false);
        return 0;
      }

      if (!silent) setLoading(true);

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_my_referrals");
        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          setReferrals(rpcData as Referral[]);
          return rpcData.length;
        }

        let username = readStoredUsername();

        if (!username) {
          const { data: userRow } = await supabase
            .from("users")
            .select("username")
            .eq("id", userId)
            .maybeSingle();
          username = String((userRow as any)?.username || "");
        }

        if (!username) {
          setReferrals([]);
          return 0;
        }

        const { data: refs, error: refsError } = await supabase
          .from("users")
          .select("id, username, profile_photo, created_at, city, state")
          .ilike("referred_by", username)
          .order("created_at", { ascending: false });

        if (!refsError && Array.isArray(refs)) {
          setReferrals(refs as Referral[]);
          return refs.length;
        }

        setReferrals([]);
        return 0;
      } catch (e) {
        console.warn("Failed to fetch referrals:", e);
        return 0;
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    let cancelled = false;
    const retryTimers: number[] = [];

    const refresh = async (silent = false) => {
      if (cancelled) return;
      await fetchReferrals({ silent });
    };

    refresh(false);

    // First login uses custom sessionStorage immediately, while Supabase Auth syncs in
    // the background. Retry and listen for auth readiness so the circle fills without refresh.
    [700, 1800, 3500].forEach((delay) => {
      const timer = window.setTimeout(() => refresh(true), delay);
      retryTimers.push(timer);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        refresh(true);
      }
    });

    const handleAuthReady = () => refresh(true);
    window.addEventListener("dimes-auth-session-ready", handleAuthReady);

    return () => {
      cancelled = true;
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      subscription.unsubscribe();
      window.removeEventListener("dimes-auth-session-ready", handleAuthReady);
    };
  }, [fetchReferrals]);

  const sorted = useMemo(
    () =>
      [...referrals].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [referrals]
  );

  const filtered = useMemo(() => {
    const u = filterUsername.trim().toLowerCase();
    const c = filterCity.trim().toLowerCase();
    const s = filterState.trim().toLowerCase();
    return sorted.filter((r) => {
      if (u && !(r.username || "").toLowerCase().includes(u)) return false;
      if (c && !((r.city || "").toLowerCase().includes(c))) return false;
      if (s && !((r.state || "").toLowerCase().includes(s))) return false;
      if (onlineOnly && !onlineUsers.has((r.username || "").toLowerCase())) return false;
      return true;
    });
  }, [sorted, filterUsername, filterCity, filterState, onlineOnly, onlineUsers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  useEffect(() => {
    setPage(1);
  }, [filterUsername, filterCity, filterState, onlineOnly]);

  if (loading) return null;

  const firstThree = sorted.slice(0, 3);
  const hasReferrals = sorted.length > 0;

  const renderAvatar = (ref: Referral, size: "lg" | "sm" = "sm") => {
    const dims = size === "lg" ? "w-16 h-16" : "w-14 h-14";
    const isOnline = onlineUsers.has((ref.username || "").toLowerCase());
    return (
      <Link
        to={`/profile/${ref.username}`}
        key={ref.id}
        className="flex flex-col items-center min-w-0 w-full group"
        title={`View @${ref.username}'s page`}
      >
        <div className="relative flex-shrink-0">
          <div
            className={`${dims} rounded-full overflow-hidden ring-2 ring-white shadow-md bg-gradient-to-br from-fuchsia-100 to-blue-100 flex items-center justify-center group-hover:ring-[#E916D1] transition-all duration-200 group-hover:scale-105`}
          >
            {ref.profile_photo ? (
              <img
                src={ref.profile_photo}
                alt={ref.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold text-blue-700">
                {ref.username?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                aria-label={isOnline ? "Online now" : "Offline"}
                className={`absolute bottom-0 right-0 ${
                  size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5"
                } rounded-full ring-2 ring-white shadow-sm ${
                  isOnline ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              {isOnline ? "Online now" : "Offline"}
            </TooltipContent>
          </Tooltip>
        </div>

        <p
          className="text-[11px] font-semibold mt-2 text-center truncate text-slate-900 w-full max-w-[72px] group-hover:text-[#E916D1]"
          title={ref.username}
        >
          @{ref.username}
        </p>
        {(ref.city || ref.state) && (
          <p
            className="text-[10px] text-slate-500 text-center truncate w-full max-w-[72px]"
            title={`${ref.city || ""}${ref.city && ref.state ? ", " : ""}${ref.state || ""}`}
          >
            {ref.city}
            {ref.city && ref.state ? ", " : ""}
            {ref.state}
          </p>
        )}
      </Link>
    );
  };

  return (
    <TooltipProvider delayDuration={150}>
    <div className="w-full max-w-none mx-0 mb-8">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-blue-50/40 to-fuchsia-50/40 shadow-lg">
        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#E916D1] via-fuchsia-400 to-blue-500" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E916D1] to-blue-600 flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  My Money Circle
                </h3>
                <p className="text-xs text-slate-500">
                  {hasReferrals
                    ? `${sorted.length} ${sorted.length === 1 ? "referral" : "referrals"} in your network`
                    : "Start building your network"}
                </p>
              </div>
            </div>
            {hasReferrals && (
              <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <Sparkles className="w-3 h-3" />
                Active
              </div>
            )}
          </div>

          {hasReferrals ? (
            <>
              {/* Featured top 3 */}
              <div className="flex justify-center gap-6 mb-5 pb-5 border-b border-slate-200">
                {firstThree.map((ref) => renderAvatar(ref, "lg"))}
              </div>

              {/* Toggle */}
              <Button
                onClick={() => setExpanded((v) => !v)}
                className="w-full bg-gradient-to-r from-[#E916D1] to-blue-600 hover:from-[#E916D1]/90 hover:to-blue-700 text-white rounded-lg font-semibold shadow-md"
              >
                {expanded
                  ? "Hide Full Money Circle"
                  : "View Full Money Circle"}
              </Button>

              {expanded && (
                <div className="mt-5">
                  {/* Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Input
                        placeholder="Username"
                        value={filterUsername}
                        onChange={(e) => setFilterUsername(e.target.value)}
                        className="pl-9 h-9 bg-white border-slate-200 text-sm"
                      />
                    </div>
                    <Input
                      placeholder="City"
                      value={filterCity}
                      onChange={(e) => setFilterCity(e.target.value)}
                      className="h-9 bg-white border-slate-200 text-sm"
                    />
                    <Input
                      placeholder="State"
                      value={filterState}
                      onChange={(e) => setFilterState(e.target.value)}
                      className="h-9 bg-white border-slate-200 text-sm"
                    />
                  </div>

                  {/* Online-only toggle */}
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/80 px-3 py-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <Label htmlFor="online-only" className="text-sm font-medium text-slate-700 cursor-pointer">
                        Show online members only
                      </Label>
                    </div>
                    <Switch id="online-only" checked={onlineOnly} onCheckedChange={setOnlineOnly} />
                  </div>

                  {/* Results grid */}
                  {paged.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-4 max-h-96 overflow-y-auto">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-5">
                        {paged.map((ref) => renderAvatar(ref))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
                      No referrals match your filters.
                    </div>
                  )}

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-slate-500">
                      Showing{" "}
                      <span className="font-semibold text-slate-700">
                        {filtered.length === 0
                          ? 0
                          : (currentPage - 1) * PAGE_SIZE + 1}
                        –{Math.min(currentPage * PAGE_SIZE, filtered.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-slate-700">
                        {filtered.length}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-8"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Prev
                      </Button>
                      <span className="text-xs font-semibold text-slate-700 px-2">
                        Page {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="h-8"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate("/dashboard/referrals")}
                    variant="outline"
                    className="w-full mt-4 border-[#E916D1]/40 text-[#E916D1] hover:bg-[#E916D1]/10 rounded-lg font-semibold"
                  >
                    Full Team Details & Earnings →
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-900 font-semibold mb-1">
                Your circle is empty
              </p>
              <p className="text-sm text-slate-500 mb-5">
                Share your referral link and start earning today.
              </p>
              <Button
                onClick={onGetLink}
                className="bg-gradient-to-r from-[#E916D1] to-blue-600 hover:from-[#E916D1]/90 hover:to-blue-700 text-white rounded-lg font-semibold shadow-md px-6"
              >
                Get Your Referral Link
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default DashboardMoneyCircle;
