import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Ticket, Archive, Calendar, Crown, ExternalLink, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/types";

type UserRow = Tables<"users">;

type PoolRow = {
  pool_id: string;
  status: string;
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

interface UserJackpotTabProps {
  userData: UserRow;
}

const UserJackpotTab: React.FC<UserJackpotTabProps> = ({ userData }) => {
  const [currentTickets, setCurrentTickets] = useState<number>(0);
  const [ticketCodes, setTicketCodes] = useState<string[]>([]);
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [userProfiles, setUserProfiles] = useState<
    Record<string, { name: string; avatar_url?: string | null }>
  >({});
  const [currentJackpot, setCurrentJackpot] = useState<number>(0);
  const [poolStatus, setPoolStatus] = useState<string>("open");
  const [poolId, setPoolId] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false); // preserved for future
  const { toast } = useToast();

  useEffect(() => {
    if (!userData?.id) return;
    // Fetch pool first (we need pool_id for codes), then parallel fetch tickets/winners.
    (async () => {
      await fetchPool();
      await Promise.all([fetchMyTickets(), fetchWinners()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.id]);

  // Fetch ticket codes once we know the poolId (fix for empty codes)
  useEffect(() => {
    if (userData?.id && poolId) {
      fetchTicketCodes();
      fetchMyTickets();
    }
  }, [userData?.id, poolId]);

  const fetchPool = async () => {
    try {
      const { data, error } = await supabase
        .from("v_jackpot_active_pool")
        .select("total,status,pool_id,period_start,period_end")
        .single();

      if (error) throw error;

      if (data) {
        const p = data as PoolRow;
        setCurrentJackpot(Number(p.total) || 0);
        setPoolStatus(p.status || "open");
        setPoolId(p.pool_id || null);
      }
    } catch (err) {
      console.error("Error fetching jackpot pool:", err);
      toast({ title: "Jackpot", description: "Could not load current pool.", variant: "destructive" });
    }
  };

  const fetchMyTickets = async () => {
    try {
      if (!userData?.id || !poolId) {
        setCurrentTickets(0);
        return;
      }
      const { count, error } = await supabase
        .from("jackpot_tickets")
        .select("id", { count: "exact", head: true })
        .eq("tipper_id", userData.id)
        .eq("pool_id", poolId);

      if (error) throw error;
      setCurrentTickets(count || 0);
    } catch (err) {
      console.error("Error fetching my tickets (by active pool):", err);
    }
  };

  const fetchTicketCodes = async () => {
    try {
      if (!userData?.id || !poolId) {
        setTicketCodes([]);
        return;
      }
      const { data, error } = await supabase
        .from("jackpot_tickets")
        .select("code")
        .eq("pool_id", poolId)
        .eq("tipper_id", userData.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const codes = (data || [])
        .map((r: { code: string }) => r.code)
        .filter(Boolean);
      setTicketCodes(codes);
    } catch (err) {
      console.error("Error fetching ticket codes:", err);
    }
  };

  // Helper: build a display name from user profile columns
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

  const fetchWinners = async () => {
    try {
      const { data, error } = await supabase
        .from("v_jackpot_latest_winners")
        .select("draw_id,drawn_code,executed_at,user_id,role,place,percentage,amount,status")
        .limit(10);

      if (error) throw error;

      const rows = (data as WinnerRow[]) || [];
      setWinners(rows);

      // Fetch profiles for these winners
      const ids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      if (ids.length > 0) {
        await loadProfiles(ids);
      }
    } catch (err) {
      console.error("Error fetching winners:", err);
    }
  };

  const formatMoney = (n?: number | null) => {
    const v = Number(n || 0);
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const displayNameFor = (userId: string, fallback: string) => {
    const name = userProfiles[userId]?.name;
    if (name && name.trim().length > 0) return name;
    return fallback;
  };

  return (
    <div className="space-y-6">
      {/* Profile Stats Detail */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-6">
          <h4 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Profile Stats Detail
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {userData.user_type?.charAt(0).toUpperCase() + (userData.user_type?.slice(1) || "")}
              </div>
              <div className="text-sm text-gray-600">User Type</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {userData.gender?.charAt(0).toUpperCase() + (userData.gender?.slice(1) || "N/A")}
              </div>
              <div className="text-sm text-gray-600">Gender</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{currentTickets}</div>
              <div className="text-sm text-gray-600">Tickets This Week</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">{poolStatus.toUpperCase()}</div>
              <div className="text-sm text-gray-600">Pool Status</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jackpot Display */}
      <Card className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white">
        <CardContent className="p-8 text-center">
          <div className="mb-4">
            <Crown className="w-16 h-16 mx-auto mb-4 text-red-200" />
            <h2 className="text-4xl font-bold mb-2">JACKPOT</h2>
            <div className="text-6xl font-bold mb-2">${formatMoney(currentJackpot)}</div>
            <p className="text-xl text-red-100">Current Jackpot Amount</p>
          </div>

          <div className="bg-white/20 rounded-lg p-4 mb-4">
            <p className="text-lg mb-2">When pool reaches $4,000</p>
            <p className="text-xl font-bold">Saturday 12:00 am drawing</p>
            <p className="text-sm mt-2">
              ${formatMoney(Math.max(0, 4000 - currentJackpot))} to go • One code, 1st/2nd/3rd win • Rollover if no match
            </p>
          </div>

          <div className="space-y-2 text-left bg-white/10 rounded-lg p-4">
            <p className="flex items-center gap-2">
              <span>💎</span> Every $1 = 1 ticket (max 5 per tip)
            </p>
            <p className="flex items-center gap-2">
              <span>🎯</span> Weekly drawing (Saturday 12:00 am). If no match, 100% rolls to next week.
            </p>
            <div className="mt-4 flex flex-col items-center space-y-2">
              <video
                //src="https://dimesonlyworld.s3.us-east-2.amazonaws.com/Tip+and+Win+(1).mp4"
                className="w-64 h-64 md:w-80 md:h-80 object-cover rounded-lg shadow-lg border-4 border-yellow-400 hover:border-yellow-300 transition-colors"
                autoPlay
                loop
                muted
                playsInline
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
              />
              <p className="text-sm text-center max-w-md">
                View winners and live drawings on YouTube Live{" "}
                <a
                  href="https://www.youtube.com/@DimesOnlyWorld"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline hover:text-red-200"
                >
                  Click Here to Subscribe <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Your Current Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6">
            <div className="text-4xl font-bold text-blue-600 mb-2">{currentTickets}</div>
            <p className="text-gray-600 mb-4">Tickets for upcoming drawing</p>
            <Badge variant="outline" className="text-sm">
              $1 = 1 ticket • max 5 per tip
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Codes (this week, current pool) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Your Ticket Codes (This Week)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ticketCodes.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {ticketCodes.map((code, idx) => (
                <Badge key={idx} variant="secondary" className="justify-center">
                  {code}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No tickets yet. Tip to earn your first ticket!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Winners */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Recent Winners
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {winners.length > 0 ? (
              winners.map((w) => {
                const name = displayNameFor(
                  w.user_id,
                  w.role === "tipper" ? "Tipper" : w.role === "dime" ? "Dime" : "Referred Dime"
                );
                const avatar = userProfiles[w.user_id]?.avatar_url || undefined;
                const roleLabel = w.role === "tipper" ? "Tipper" : w.role === "dime" ? "Dime" : "Referred Dime";
                return (
                  <div
                    key={`${w.draw_id}-${w.user_id}-${w.place}`}
                    className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
                  >
                    <Avatar className="w-12 h-12">
                      {avatar ? <AvatarImage src={avatar} alt={name} /> : null}
                      <AvatarFallback>{(name?.[0] || roleLabel?.[0] || "U").toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{name}</div>
                      <div className="text-xs text-gray-500 capitalize">{roleLabel}</div>
                      <div className="text-sm text-gray-600">
                        Won on {new Date(w.executed_at).toLocaleDateString()} • Draw Code {w.drawn_code}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">${formatMoney(w.amount)}</div>
                      <Badge variant="outline" className="text-xs">
                        Place: {w.place}
                      </Badge>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No winners yet — be the first!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserJackpotTab;