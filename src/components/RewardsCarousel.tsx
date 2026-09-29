import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trophy, Timer, Crown } from "lucide-react";
import { callRewards, Contest, REWARD_CATEGORIES, REWARD_AUDIENCES, fmtScore } from "@/lib/rewards";
import { Button } from "@/components/ui/button";

function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}

function countdown(end: string, now: number) {
  const d = Math.max(0, new Date(end).getTime() - now);
  const days = Math.floor(d / 864e5), h = Math.floor((d % 864e5) / 36e5), m = Math.floor((d % 36e5) / 6e4), s = Math.floor((d % 6e4) / 1000);
  return days > 0 ? `${days}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`;
}

const Avatar: React.FC<{ src?: string | null; name?: string; size?: string }> = ({ src, name, size = "h-10 w-10" }) =>
  src ? <img src={src} alt={name || ""} className={`${size} rounded-full object-cover ring-2 ring-yellow-400/70`} />
      : <div className={`${size} flex items-center justify-center rounded-full bg-fuchsia-900 text-sm font-bold text-yellow-300 ring-2 ring-yellow-400/70`}>{(name || "?")[0]?.toUpperCase()}</div>;

const Slide: React.FC<{ c: Contest; now: number }> = ({ c, now }) => {
  const cat = REWARD_CATEGORIES[c.category] || { label: c.category, unit: "", icon: "🏆" };
  const prize = c.prize_label || `$${Number(c.prize_amount).toLocaleString()}`;
  const top = c.leaders[0]?.score || 0;

  if (c.status === "won" && c.winner) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-300">🎉 We have a winner 🎉</p>
        <Crown className="h-8 w-8 animate-bounce text-yellow-400" />
        <Avatar src={c.winner.avatar} name={c.winner.username} size="h-20 w-20" />
        <p className="text-2xl font-black text-white">@{c.winner.username}</p>
        <p className="text-sm text-fuchsia-200">won <span className="font-bold text-yellow-300">{prize}</span> · {c.title}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-[1.1fr_1fr] md:items-center">
      <div className="text-center md:text-left">
        <p className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-fuchsia-200">
          <span>{cat.icon}</span>{cat.label}
        </p>
        <div className="mt-3 flex items-center justify-center gap-3 md:justify-start">
          {c.featured_user && <Avatar src={c.featured_user.avatar} name={c.featured_user.username} size="h-12 w-12" />}
          <h3 className="text-xl font-black text-white md:text-2xl">{c.title}</h3>
        </div>
        <p className="mt-1 bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 bg-clip-text text-4xl font-black text-transparent drop-shadow-[0_0_18px_rgba(250,204,21,0.45)] md:text-5xl">{prize}</p>
        {c.description && <p className="mt-2 text-sm text-fuchsia-100/80">{c.description}</p>}
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs md:justify-start">
          {c.contest_type === "most" && c.ends_at && <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 font-mono text-yellow-200"><Timer className="h-3.5 w-3.5" />{countdown(c.ends_at, now)}</span>}
          {c.contest_type === "goal" && <span className="rounded-full bg-black/40 px-3 py-1 text-white">First to {fmtScore(c.category, c.goal || 0)} {cat.unit}</span>}
          <span className="rounded-full bg-black/40 px-3 py-1 text-fuchsia-100">{c.audience.map((a) => REWARD_AUDIENCES[a]).join(" · ")}</span>
        </div>
        {c.my && <p className="mt-3 text-sm font-semibold text-yellow-300">You're #{c.my.rank} with {fmtScore(c.category, c.my.score)} {cat.unit}</p>}
      </div>

      <div className="rounded-xl bg-black/35 p-3 backdrop-blur">
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-yellow-300"><Trophy className="h-4 w-4" />Live leaderboard</p>
        {c.leaders.length === 0 ? (
          <p className="py-6 text-center text-sm text-fuchsia-100/80">No one's on the board yet — be the first!</p>
        ) : (
          <ul className="space-y-2">
            {c.leaders.map((l) => {
              const base = c.contest_type === "goal" && c.goal ? c.goal : top || 1;
              const pct = Math.min(100, (l.score / base) * 100);
              const me = c.my?.user_id === l.user_id;
              return (
                <li key={l.user_id} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${me ? "bg-yellow-400/20 ring-1 ring-yellow-400" : ""}`}>
                  <span className={`w-5 text-center text-sm font-black ${l.rank === 1 ? "text-yellow-300" : "text-fuchsia-200"}`}>{l.rank}</span>
                  <Avatar src={l.avatar} name={l.username} size="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate font-semibold text-white">@{l.username}</span>
                      <span className="font-mono text-yellow-200">{fmtScore(c.category, l.score)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-yellow-400 transition-all duration-1000" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

const RewardsCarousel: React.FC = () => {
  const [items, setItems] = useState<Contest[]>([]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const now = useNow();

  useEffect(() => {
    let alive = true;
    const load = () => callRewards<{ contests: Contest[] }>("list").then((d) => alive && setItems(d.contests || [])).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (items.length < 2 || paused) return;
    const t = setInterval(() => setI((p) => (p + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [items.length, paused]);

  if (!items.length) return null;
  const idx = i % items.length;
  const go = (d: number) => setI((p) => (p + d + items.length) % items.length);
  const backgroundUrl = items[idx].background_image_url;
  const videoBackground = backgroundUrl && /\.(mp4|webm|mov|m4v)(?:$|\?)/i.test(backgroundUrl);
  const categoryTheme: Record<string, string> = {
    most_tipped: "reward-theme-tipped",
    highest_rated: "reward-theme-rated",
    car_sales: "reward-theme-cars",
    money_circle: "reward-theme-circle",
    dimes_recruited: "reward-theme-dimes",
    most_likes: "reward-theme-likes",
    tips_given: "reward-theme-giving",
  };
  const defaultTheme = backgroundUrl ? "" : categoryTheme[items[idx].category] || "reward-theme-default";

  return (
    <section
      className={`reward-carousel ${defaultTheme} relative mb-6 overflow-hidden rounded-2xl border border-dimes-gold/40 bg-dimes-surface-elevated p-5 shadow-lg md:p-7`}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    >
      {!backgroundUrl && <div className="reward-theme-pattern absolute inset-0" aria-hidden="true" />}
      {backgroundUrl && (videoBackground
        ? <video key={backgroundUrl} src={backgroundUrl} autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
        : <img src={backgroundUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />)}
      {backgroundUrl && <div className="absolute inset-0 bg-background/75" />}
      <p className="relative mb-4 text-center text-xs font-black uppercase tracking-[0.35em] text-yellow-300">🏆 Rewards & Bonuses 🏆</p>
      <div key={items[idx].id} className="relative animate-fade-in">
        <Slide c={items[idx]} now={now} />
      </div>
      {items.length > 1 && (
        <>
          <Button type="button" size="icon" variant="secondary" aria-label="Previous contest" onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2"><ChevronLeft className="h-5 w-5" /></Button>
          <Button type="button" size="icon" variant="secondary" aria-label="Next contest" onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2"><ChevronRight className="h-5 w-5" /></Button>
          <div className="relative mt-4 flex justify-center gap-1.5">
            {items.map((c, k) => (
              <Button type="button" key={c.id} variant="ghost" aria-label={`Contest ${k + 1}`} onClick={() => setI(k)} className={`h-2 min-w-0 rounded-full p-0 transition-all ${k === idx ? "w-6 bg-dimes-gold" : "w-2 bg-foreground/40"}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default RewardsCarousel;
