import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

type UserProfile = {
  id: string;
  username: string | null;
  profile_photo: string | null;
};

const formatMoney = (n?: number | null) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const placeLabel = (place: number) =>
  place === 1 ? "Grand Prize" : place === 2 ? "Second Place" : "Third Place";

const rolePretty = (role: WinnerRow["role"]) =>
  role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const JackpotWinnersBanner: React.FC = () => {
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("v_jackpot_latest_winners")
          .select(
            "draw_id, drawn_code, executed_at, user_id, role, place, percentage, amount, status"
          )
          .order("executed_at", { ascending: false })
          .limit(50);

        if (error || !data || data.length === 0) {
          setWinners([]);
          setLoading(false);
          return;
        }

        // Most recent draw
        const sorted = (data as WinnerRow[]).sort(
          (a, b) =>
            new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()
        );
        const latestDrawId = sorted[0].draw_id;
        const latest = sorted.filter((w) => w.draw_id === latestDrawId);

        // Show places 1–3
        const top = latest
          .filter((w) => [1, 2, 3].includes(w.place))
          .sort((a, b) => a.place - b.place);

        setWinners(top);

        // Load minimal profiles
        const ids = Array.from(new Set(top.map((w) => w.user_id)));
        if (ids.length) {
          const { data: users } = await supabase
            .from("users")
            .select("id, username, profile_photo")
            .in("id", ids);
          const map: Record<string, UserProfile> = {};
          (users || []).forEach((u: any) => {
            map[u.id] = u;
          });
          setProfiles(map);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const executedAt = useMemo(() => {
    if (!winners.length) return null;
    return new Date(winners[0].executed_at);
  }, [winners]);

  return (
    <section className="bg-neutral-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Outer box to keep header + grid visually together */}
        <Card className="bg-neutral-950 border border-neutral-900/80 rounded-2xl">
          <CardContent className="p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-white text-2xl font-semibold">Latest Jackpot Winners</h3>
                {loading ? (
                  <p className="text-neutral-500 text-sm">Loading latest results…</p>
                ) : executedAt ? (
                  <p className="text-neutral-400 text-sm">
                    Drawn on{" "}
                    <span className="text-neutral-300 font-medium">
                      {executedAt.toLocaleString()}
                    </span>
                  </p>
                ) : (
                  <p className="text-neutral-400 text-sm">No winners yet. Check back soon.</p>
                )}
              </div>

              {/* Code badge: stacks under title on small, right on md+ */}
              {winners.length > 0 ? (
                <div className="md:shrink-0">
                  <span className="inline-flex items-center gap-2 rounded-full bg-neutral-900 border border-neutral-800 px-3 py-1">
                    <span className="text-neutral-400 text-xs uppercase tracking-wide">Code</span>
                    <span className="font-mono text-indigo-300 text-sm">
                      {winners[0].drawn_code}
                    </span>
                  </span>
                </div>
              ) : null}
            </div>

            {/* Content */}
            {loading ? (
              <div className="text-center text-neutral-400">Please wait…</div>
            ) : winners.length === 0 ? (
              <div className="text-center text-neutral-400">No winners to display.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
                {winners.map((w) => {
                  const u = profiles[w.user_id];
                  const username = u?.username || "";
                  const displayName = username || "User";
                  const avatar = u?.profile_photo || "";
                  const initial = (displayName[0] || "U").toUpperCase();

                  return (
                    <Card
                      key={`${w.draw_id}:${w.user_id}`}
                      className="bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 transition-colors rounded-xl shadow-sm"
                    >
                      <CardContent className="p-4">
                        {/* Person */}
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {avatar ? (
                              <AvatarImage src={avatar} alt={displayName} />
                            ) : (
                              <AvatarFallback>{initial}</AvatarFallback>
                            )}
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-white font-medium truncate">{displayName}</div>
                            <div className="text-neutral-400 text-[11px]">
                              {placeLabel(w.place)} • {rolePretty(w.role)}
                            </div>
                          </div>
                        </div>

                        {/* Prize */}
                        <div className="mt-4 rounded-lg bg-neutral-900 border border-neutral-800 p-3">
                          <div className="flex items-baseline justify-between">
                            <div className="text-neutral-400 text-xs uppercase tracking-wide">Prize</div>
                            <div className="text-emerald-300 text-lg md:text-xl font-semibold">
                              ${formatMoney(w.amount)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
export default JackpotWinnersBanner;