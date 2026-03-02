import React, { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
    <section className="w-full bg-gradient-to-b from-black via-gray-900 to-black py-10">
      {/* Jackpot Display */}
      <div className="flex justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-8 h-8 text-[#E916D1]" />
            <span className="text-2xl font-bold text-black uppercase tracking-wide">
              Jackpot
            </span>
          </div>
          <div className="text-5xl font-bold text-[#E916D1]">
            {formatCurrency(jackpotAmount)}
          </div>
        </div>
      </div>

      {/* Tip & Win Info */}
      <div className="mt-10 text-center px-4 max-w-2xl mx-auto space-y-4">
        <h3 className="text-4xl md:text-5xl font-black text-[#E916D1] tracking-tighter italic uppercase">
          TIP & WIN
        </h3>
        <p className="text-lg md:text-xl font-bold text-white">
          TIP DIMES FOR A CHANCE AT THE JACKPOT ABOVE.
        </p>
        <div className="text-sm md:text-base text-gray-300 space-y-3 font-medium leading-relaxed">
          <p>
            <span className="text-white font-semibold">MINIMUM DRAWING $1,000</span> = Starts This
            Saturday on YouTube Live Dimes Only Podcast when $1,000 shows above.
          </p>
          <p>
            <span className="text-white font-semibold">MAXIMUM DRAWING = $1,973,400</span>
          </p>
          <p className="text-[#E916D1] font-bold">Max = GUARANTEED WINNER</p>
          <p>Refer people = More tickets for you!</p>
          <p>No winner = tickets roll over to the following Saturday drawing.</p>
        </div>
        <a
          href="/jackpot"
          className="inline-block mt-4 text-lg font-bold text-[#E916D1] underline underline-offset-4 hover:text-[#E916D1]/80 transition"
        >
          Details inside!
        </a>
      </div>
    </section>
  );
};

export default JackpotTipWin;
