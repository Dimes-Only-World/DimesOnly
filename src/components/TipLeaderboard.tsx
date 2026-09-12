import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Trophy, Plane, PartyPopper, Timer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import defaultAvatar from "@/assets/default-avatar.png.asset.json";

interface TopDime {
  user_id: string;
  username: string;
  profile_photo: string | null;
  city: string | null;
  state: string | null;
  total_tipped: number;
  tip_count: number;
}

interface TopTipper {
  user_id: string;
  username: string;
  profile_photo: string | null;
  total_tipped: number;
}

const PRIZES = [
  { place: 1, label: "1st Place", amount: "$10,000", note: "Max prize" },
  { place: 2, label: "2nd Place", amount: "$2,500", note: "Max prize" },
  { place: 3, label: "3rd Place", amount: "$1,000", note: "Max prize" },
];

const currency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Season runs Jan 1 12:00AM through Dec 31, resetting every year. */
const getTipSeasonYear = () => new Date().getFullYear();

const getSeasonReset = (year: number) => new Date(year + 1, 0, 1, 0, 0, 0, 0);

const useCountdown = (target: Date) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(target.getTime() - now, 0);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return { days, hours, minutes };
};

const TipLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const seasonYear = getTipSeasonYear();
  const resetDate = useMemo(() => getSeasonReset(seasonYear), [seasonYear]);
  const { days, hours, minutes } = useCountdown(resetDate);

  const [topDimes, setTopDimes] = useState<TopDime[]>([]);
  const [topTipper, setTopTipper] = useState<TopTipper | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [dimesRes, tipperRes] = await Promise.all([
          supabase.rpc("tip_leaderboard_top_dimes", { p_year: seasonYear, p_limit: 3 }),
          supabase.rpc("tip_leaderboard_top_tippers", { p_year: seasonYear, p_limit: 1 }),
        ]);

        if (cancelled) return;

        if (!dimesRes.error && dimesRes.data) {
          setTopDimes(
            (dimesRes.data as TopDime[]).map((row) => ({
              ...row,
              total_tipped: Number(row.total_tipped) || 0,
            }))
          );
        }

        if (!tipperRes.error && tipperRes.data) {
          const first = (tipperRes.data as TopTipper[])[0];
          if (first) {
            setTopTipper({ ...first, total_tipped: Number(first.total_tipped) || 0 });
          }
        }
      } catch (error) {
        console.error("Tip leaderboard error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [seasonYear]);

  const podiumStyles = [
    {
      ring: "border-yellow-400/60",
      glow: "shadow-[0_0_40px_-10px_rgba(250,204,21,0.6)]",
      chip: "bg-yellow-400 text-black",
      accent: "text-yellow-300",
    },
    {
      ring: "border-slate-300/50",
      glow: "shadow-[0_0_40px_-14px_rgba(226,232,240,0.5)]",
      chip: "bg-slate-200 text-black",
      accent: "text-slate-200",
    },
    {
      ring: "border-orange-400/60",
      glow: "shadow-[0_0_40px_-14px_rgba(251,146,60,0.5)]",
      chip: "bg-orange-400 text-black",
      accent: "text-orange-300",
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B0611] via-[#170A22] to-[#0B0611] px-5 py-10 md:px-10 md:py-14">
      <div className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full bg-yellow-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-[#E916D1]/20 blur-3xl" />

      <div className="relative text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-1.5 backdrop-blur">
          <Trophy className="h-4 w-4 text-yellow-400" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-yellow-300">
            {seasonYear} Highest Tipped
          </span>
        </div>

        <h2 className="mt-5 text-3xl font-black uppercase leading-tight tracking-tight text-white md:text-5xl">
          Top 3{" "}
          <span className="bg-gradient-to-r from-yellow-300 via-[#FF5FD1] to-[#E916D1] bg-clip-text text-transparent">
            Highest Tipped
          </span>
        </h2>
        <div className="mx-auto mt-4 h-[3px] w-28 rounded-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />

        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
          Standings run January 1 at 12:00&nbsp;AM through December 31, then reset for the
          new year — every year.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-slate-300">
          <Timer className="h-3.5 w-3.5 text-[#E916D1]" />
          Resets in {days}d {hours}h {minutes}m
        </div>
      </div>

      {/* Podium */}
      <div className="relative mt-10">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-yellow-400/30 border-t-yellow-400" />
          </div>
        ) : topDimes.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 py-12 text-center">
            <Trophy className="mx-auto mb-3 h-12 w-12 text-slate-600" />
            <h3 className="text-lg font-semibold text-white">
              No tips yet for {seasonYear}
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Be the first to put someone on the podium.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {topDimes.map((dime, index) => {
              const style = podiumStyles[index] ?? podiumStyles[2];
              const prize = PRIZES[index];

              return (
                <button
                  key={dime.user_id}
                  onClick={() => navigate(`/profile/${dime.username}`)}
                  className={`group relative overflow-hidden rounded-2xl border bg-[#100A17] text-left transition-all duration-300 hover:-translate-y-1 ${style.ring} ${style.glow} ${
                    index === 0 ? "sm:-translate-y-3" : ""
                  }`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-slate-900">
                    <img
                      src={dime.profile_photo || defaultAvatar.url}
                      alt={`${dime.username} profile photo`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.src !== window.location.origin + defaultAvatar.url) {
                          img.src = defaultAvatar.url;
                        }
                      }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B0611] via-[#0B0611]/25 to-transparent" />

                    <div
                      className={`absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-sm font-black shadow ${style.chip}`}
                    >
                      {index + 1}
                    </div>

                    {index === 0 && (
                      <Crown className="absolute right-3 top-3 h-6 w-6 text-yellow-300 drop-shadow" />
                    )}

                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h3 className="truncate text-lg font-extrabold text-white">
                        @{dime.username}
                      </h3>
                      {(dime.city || dime.state) && (
                        <p className="truncate text-xs text-slate-300">
                          {dime.city && dime.state
                            ? `${dime.city}, ${dime.state}`
                            : dime.city || dime.state}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 p-4">
                    <div className={`text-xl font-black ${style.accent}`}>
                      {currency(dime.total_tipped)}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-400">
                      Tipped in {seasonYear}
                    </div>
                    {prize && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                        <Trophy className="h-3 w-3 text-yellow-400" />
                        {prize.label} · up to {prize.amount}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Prize board */}
      <div className="relative mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PRIZES.map((prize) => (
          <div
            key={prize.place}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              {prize.label}
            </div>
            <div className="mt-2 text-3xl font-black text-white">{prize.amount}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wider text-yellow-300/80">
              {prize.note}
            </div>
          </div>
        ))}
      </div>

      {/* Rules / language */}
      <div className="relative mt-8 rounded-2xl border border-[#E916D1]/30 bg-[#E916D1]/5 p-6 backdrop-blur">
        <div className="flex items-start gap-3">
          <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-[#FF5FD1]" />
          <div className="space-y-3 text-sm leading-relaxed text-slate-200">
            <p className="font-bold uppercase tracking-wide text-white">
              New Year&apos;s Eve Party — Attendance Required
            </p>
            <p>
              The highest tipped Dimes <strong className="text-white">must attend the
              New Year&apos;s Eve party to collect their cash prizes</strong>. Prizes are not
              awarded to winners who do not attend.
            </p>
            <p>
              Prize amounts are maximums:{" "}
              <strong className="text-yellow-300">1st place up to $10,000</strong>,{" "}
              <strong className="text-slate-200">2nd place up to $2,500</strong>, and{" "}
              <strong className="text-orange-300">3rd place up to $1,000</strong>. Final
              payouts are determined by the Dimes.
            </p>
          </div>
        </div>
      </div>

      {/* Top tipper reward */}
      <div className="relative mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-6 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Plane className="mt-0.5 h-5 w-5 shrink-0 text-yellow-300" />
            <div className="space-y-1 text-sm leading-relaxed text-slate-200">
              <p className="font-bold uppercase tracking-wide text-white">
                Highest Tipper of the Year
              </p>
              <p>
                The highest tipper for the year gets{" "}
                <strong className="text-yellow-300">
                  flown out to the New Year&apos;s Eve party and housed for 2 nights
                </strong>
                .
              </p>
            </div>
          </div>

          {topTipper && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <img
                src={topTipper.profile_photo || defaultAvatar.url}
                alt={`${topTipper.username} profile photo`}
                className="h-11 w-11 rounded-full border border-yellow-400/50 object-cover"
                onError={(e) => {
                  e.currentTarget.src = defaultAvatar.url;
                }}
              />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">
                  Current Leader
                </div>
                <div className="text-sm font-bold text-white">@{topTipper.username}</div>
                <div className="text-xs font-semibold text-yellow-300">
                  {currency(topTipper.total_tipped)} tipped
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TipLeaderboard;
