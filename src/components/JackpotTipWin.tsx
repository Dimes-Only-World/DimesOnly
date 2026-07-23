import React, { useState, useEffect } from "react";
import { Trophy, Ticket, Sparkles, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import jackpotBg from "@/assets/jackpot-bg.mp4.asset.json";

const JackpotTipWin: React.FC = () => {
  const [jackpotAmount, setJackpotAmount] = useState(0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  useEffect(() => {
    const fetchJackpot = async () => {
      try {
        const { data: poolData, error: poolError } = await supabase
          .from("v_jackpot_active_pool")
          .select("total")
          .single();
        if (!poolError && poolData?.total != null) {
          setJackpotAmount(Number(poolData.total) || 0);
          return;
        }
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("jackpot")
          .select("amount")
          .single();
        if (!fallbackError && fallbackData?.amount != null) {
          setJackpotAmount(Number(fallbackData.amount) || 0);
        }
      } catch (e) {
        console.error("[JackpotTipWin] Jackpot fetch error:", e);
      }
    };
    fetchJackpot();
    const sub = supabase
      .channel("homepage_jackpot_tipwin")
      .on("postgres_changes", { event: "*", schema: "public", table: "jackpot_pools" }, () => fetchJackpot())
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, []);

  return (
    <section className="relative w-full overflow-hidden bg-black">
      {/* Background Video */}
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-40"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      >
        <source src={jackpotBg.url} type="video/mp4" />
      </video>

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(600px circle at 50% 30%, rgba(233,22,209,0.35), transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 md:py-28">
        {/* Eyebrow */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E916D1]/40 bg-[#E916D1]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#E916D1] backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Weekly Jackpot Drawing
          </span>
        </div>

        {/* Jackpot Card */}
        <div className="mx-auto max-w-2xl">
          <div className="relative rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10 text-center shadow-[0_25px_80px_-20px_rgba(233,22,209,0.5)] backdrop-blur-xl">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Trophy className="h-7 w-7 text-[#E916D1]" />
              <span className="text-sm font-semibold uppercase tracking-[0.35em] text-white/70">
                Current Jackpot
              </span>
            </div>
            <div className="bg-gradient-to-b from-white via-white to-[#E916D1] bg-clip-text text-6xl md:text-7xl font-black tracking-tight text-transparent tabular-nums">
              {formatCurrency(jackpotAmount)}
            </div>
            <div className="mt-4 text-xs uppercase tracking-widest text-white/50">
              Live pool · Updates in real time
            </div>
          </div>
        </div>

        {/* Tip & Win Heading */}
        <div className="mt-14 text-center">
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-white">
            Tip <span className="text-[#E916D1]">&</span> Win
          </h2>
          <p className="mt-4 text-base md:text-lg text-white/70 max-w-xl mx-auto">
            Tip a Dime for your chance to win the jackpot above. Every tip earns you entries.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Minimum Draw</div>
            <div className="text-2xl font-bold text-white">$1,000</div>
            <p className="mt-2 text-sm text-white/60">
              Drawings begin Saturdays on the Dimes Only YouTube Live Podcast once the pool reaches $1,000.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E916D1]/30 bg-gradient-to-b from-[#E916D1]/10 to-transparent p-6 backdrop-blur-md">
            <div className="text-xs uppercase tracking-widest text-[#E916D1] mb-2">Maximum Draw</div>
            <div className="text-2xl font-bold text-white">$1,973,400</div>
            <p className="mt-2 text-sm text-white/70">
              At max, the drawing is a <span className="font-semibold text-[#E916D1]">Guaranteed Winner</span>.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <div className="text-xs uppercase tracking-widest text-white/50 mb-2">More Tickets</div>
            <div className="flex items-center gap-2 text-2xl font-bold text-white">
              <Ticket className="h-6 w-6 text-[#E916D1]" />
              Refer & Earn
            </div>
            <p className="mt-2 text-sm text-white/60">
              Refer people to earn more tickets. Unclaimed pots roll over to the next Saturday drawing.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 flex justify-center">
          <a
            href="/jackpot"
            className="group inline-flex items-center gap-2 rounded-full bg-[#E916D1] px-8 py-3.5 text-sm font-semibold uppercase tracking-widest text-white shadow-lg shadow-[#E916D1]/40 transition hover:bg-[#E916D1]/90 hover:shadow-[#E916D1]/60"
          >
            See Full Details
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default JackpotTipWin;
