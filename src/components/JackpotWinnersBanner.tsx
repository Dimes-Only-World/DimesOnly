import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

type WinnerRow = {
  draw_id: string;
  drawn_code: string | null;
  executed_at: string;
  user_id: string;
  username: string | null;
  profile_photo: string | null;
  role:
    | "tipper"
    | "dime"
    | "referred_dime"
    | "dime_referred_dime"
    | "referred_dime_referrer"
    | "who_referred_tipper";
  place: 1 | 2 | 3;
  percentage: string | number | null;
  amount: string | number | null;
  status: string | null;
};

type Profile = {
  username: string | null;
  profile_photo: string | null;
};
type ProfilesMap = Record<string, Profile>;

const roleOrder: Record<string, number> = {
  // Grand Prize
  tipper: 1,
  dime: 2,
  referred_dime: 3,
  // 2nd Place
  dime_referred_dime: 4,
  referred_dime_referrer: 5,
  // 3rd Place
  who_referred_tipper: 6,
};

function roleLabel(role: WinnerRow["role"]): string {
  switch (role) {
    case "tipper":
      return "Grand Prize • Tipper";
    case "dime":
      return "Grand Prize • Dime Winner";
    case "referred_dime":
      return "Grand Prize • Dime Recruiter Winner";
    case "dime_referred_dime":
      return "2nd Place";
    case "referred_dime_referrer":
      return "2nd Place";
    case "who_referred_tipper":
      return "3rd Place";
    default:
      return "";
  }
}

function formatCurrency(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n || 0);
}

// Winner card with mobile-first layout:
// - Mobile: Full username ABOVE the image (clear who won), then image with details below.
// - Desktop: Image left, details + prize to the right (classic row layout).
const WinnerCard: React.FC<{ w: WinnerRow }> = ({ w }) => {
  const photo =
    w.profile_photo ||
    "https://dimesonly.s3.us-east-2.amazonaws.com/default-avatar.png";
  const name = w.username || "User";
  const amount = formatCurrency(w.amount);

  return (
    <div className="w-full">
      <div className="p-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 transition">
        {/* Mobile name above image */}
        <div className="md:hidden mb-2">
          <div className="text-white text-base font-semibold break-words">
            {name}
          </div>
          <div className="text-neutral-400 text-sm">{roleLabel(w.role)}</div>
        </div>

        {/* Content row (image + details). On desktop shows name inline; on mobile only shows image + prize row since name is above */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          {/* Image */}
          <div className="shrink-0">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-lg overflow-hidden bg-neutral-800 border border-neutral-700">
              <img
                src={photo}
                alt={name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          {/* Details (desktop shows name here; mobile shows only prize since name is above) */}
          <div className="min-w-0 flex-1">
            <div className="hidden md:flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white text-lg md:text-xl font-semibold truncate">
                  {name}
                </div>
                <div className="text-neutral-400 text-sm md:text-base">
                  {roleLabel(w.role)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-neutral-400 text-xs md:text-sm uppercase tracking-wide">
                  Prize
                </div>
                <div className="text-emerald-400 text-lg md:text-2xl font-bold tabular-nums">
                  {amount}
                </div>
              </div>
            </div>

            {/* Mobile prize row under the image (since desktop prize is above) */}
            <div className="md:hidden mt-3 flex items-center justify-between">
              <div className="text-neutral-400 text-xs uppercase tracking-wide">
                Prize
              </div>
              <div className="text-emerald-400 text-lg font-bold tabular-nums">
                {amount}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const JackpotWinnersBanner: React.FC = () => {
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch: latest draw_id, winners for that draw, then hydrate user profiles.
  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);

        // 1) Find latest draw by executed_at
        const { data: latest, error: latestErr } = await supabase
          .from("v_jackpot_latest_winners")
          .select("draw_id, executed_at")
          .order("executed_at", { ascending: false })
          .limit(1);

        if (latestErr || !latest?.length) {
          setWinners([]);
          return;
        }

        const drawId: string = String(latest[0].draw_id);

        // 2) Get all winners for that draw
        const { data: all, error: allErr } = await supabase
          .from("v_jackpot_latest_winners")
          .select("*")
          .eq("draw_id", drawId)
          .order("place", { ascending: true });

        if (allErr || !all?.length) {
          setWinners([]);
          return;
        }

        // 3) Fetch profile info for these user_ids
        const ids: string[] = Array.from(
          new Set(
            (all as any[])
              .map((w) => (w.user_id ? String(w.user_id) : null))
              .filter((id): id is string => Boolean(id))
          )
        );

        let profiles: ProfilesMap = {};

        for (const w of all as any[]) {
          const rawId = w.user_id ? String(w.user_id) : null;
          if (!rawId) continue;
          profiles[rawId] = {
            username: w.username ?? null,
            profile_photo: w.profile_photo ?? null,
          };
        }

        if (ids.length) {
          const { data: users } = await supabase
            .from("users")
            .select("id, username, profile_photo")
            .in("id", ids);
          for (const u of users || []) {
            const key = String(u.id);
            profiles[key] = {
              username: u.username ?? null,
              profile_photo: u.profile_photo ?? null,
            };
          }
        }

        // 4) Enrich winners with username/photo (prefer row data, fallback to fetched profile)
        const enriched: WinnerRow[] = (all as any[]).map((w) => {
          const rawId = w.user_id ? String(w.user_id) : null;
          const p = rawId ? profiles[rawId] : undefined;
          return {
            draw_id: String(w.draw_id),
            drawn_code: w.drawn_code ?? null,
            executed_at: String(w.executed_at),
            user_id: rawId,
            username: (w.username ?? p?.username ?? null) as string | null,
            profile_photo: (w.profile_photo ?? p?.profile_photo ?? null) as
              | string
              | null,
            role: w.role as WinnerRow["role"],
            place: Number(w.place) as WinnerRow["place"],
            percentage:
              (typeof w.percentage === "number"
                ? w.percentage
                : w.percentage ?? null) as string | number | null,
            amount:
              (typeof w.amount === "number" ? w.amount : w.amount ?? null) as
                | string
                | number
                | null,
            status: (w.status ?? null) as string | null,
          };
        });

        // 5) Sort for display: by place, then by our role order within the place
        const sorted = enriched.sort((a, b) => {
          if (a.place !== b.place) return a.place - b.place;
          const ao = roleOrder[a.role] ?? 999;
          const bo = roleOrder[b.role] ?? 999;
          return ao - bo;
        });

        setWinners(sorted);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const executedAtLocal = useMemo(() => {
    if (!winners.length) return null;
    const d = new Date(winners[0].executed_at);
    return d.toLocaleString("en-US", { timeZone: "America/New_York" });
  }, [winners]);

  const drawnCode = useMemo(() => {
    if (!winners.length) return null;
    return winners[0].drawn_code || null;
  }, [winners]);

  const grandPrize = useMemo(
    () => winners.filter((w) => w.place === 1),
    [winners]
  );
  const secondPlace = useMemo(
    () => winners.filter((w) => w.place === 2),
    [winners]
  );
  const thirdPlace = useMemo(
    () => winners.filter((w) => w.place === 3),
    [winners]
  );

  return (
    <section className="bg-neutral-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-neutral-950 border border-neutral-900/80 rounded-2xl">
          <CardContent className="p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <h3 className="text-white text-2xl md:text-3xl font-semibold">
                  Latest Jackpot Winners
                </h3>
                {loading ? (
                  <p className="text-neutral-500 text-sm">
                    Loading latest results…
                  </p>
                ) : executedAtLocal ? (
                  <p className="text-neutral-400 text-sm">
                    Drawn on{" "}
                    <span className="text-neutral-300 font-medium">
                      {executedAtLocal}
                    </span>
                  </p>
                ) : (
                  <p className="text-neutral-400 text-sm">
                    No winners yet. Check back soon.
                  </p>
                )}
              </div>

              {/* Winning Ticket ID pill */}
              {winners.length > 0 ? (
                <div className="md:shrink-0">
                  <span className="inline-flex items-center gap-2 rounded-full bg-neutral-900 border border-neutral-800 px-3 py-1">
                    <span className="text-neutral-400 text-xs uppercase tracking-wide">
                      Winning Ticket ID
                    </span>
                    <span className="font-mono text-indigo-300 text-sm">
                      {drawnCode}
                    </span>
                  </span>
                </div>
              ) : null}
            </div>

            {/* Content */}
            {winners.length === 0 && !loading ? (
              <div className="text-neutral-400 text-sm">
                No winners to display.
              </div>
            ) : (
              <div className="space-y-8">
                {/* Grand Prize Section */}
                {grandPrize.length > 0 && (
                  <section>
                    <h4 className="text-white text-xl md:text-2xl font-semibold mb-4">
                      Grand Prize
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {grandPrize.map((w) => (
                        <WinnerCard key={`${w.user_id}-${w.role}`} w={w} />
                      ))}
                    </div>
                  </section>
                )}

                {/* 2nd Place Section */}
                {secondPlace.length > 0 && (
                  <section>
                    <h4 className="text-white text-xl md:text-2xl font-semibold mb-4">
                      2nd Place
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {secondPlace.map((w) => (
                        <WinnerCard key={`${w.user_id}-${w.role}`} w={w} />
                      ))}
                    </div>
                  </section>
                )}

                {/* 3rd Place Section */}
                {thirdPlace.length > 0 && (
                  <section>
                    <h4 className="text-white text-xl md:text-2xl font-semibold mb-4">
                      3rd Place
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {thirdPlace.map((w) => (
                        <WinnerCard key={`${w.user_id}-${w.role}`} w={w} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default JackpotWinnersBanner;