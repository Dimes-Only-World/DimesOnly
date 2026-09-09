import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Flame, Loader2 } from "lucide-react";
import FlixNav from "@/components/flix/FlixNav";
import FlixFooter from "@/components/flix/FlixFooter";
import { FLIX_PLANS, getFlixRefCode, fetchMySubscription } from "@/lib/flix";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import "@/components/flix/flix.css";

const PERKS = ["Unlimited streaming", "Watch on any device", "Support the creators", "Cancel anytime"];

const FlixPricing: React.FC = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const subscribe = async () => {
    if (!user?.id) {
      navigate("/login?next=/flix/pricing");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const existing = await fetchMySubscription(user.id);
      if (existing) {
        setDone(true);
        return;
      }
      const selected = FLIX_PLANS[plan];
      const refCode = getFlixRefCode();
      const periodEnd = new Date();
      if (plan === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      else periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { error: insertError } = await supabase.from("flix_subscriptions").insert({
        user_id: user.id,
        plan,
        status: "active",
        amount_cents: selected.cents,
        referral_code: refCode || null,
        is_demo: true,
        current_period_end: periodEnd.toISOString(),
      });
      if (insertError) throw insertError;
      setDone(true);
    } catch (e) {
      setError((e as Error).message || "Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-white">
        <FlixNav />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#FF4D1A]/20 flex items-center justify-center">
            <Check size={32} className="text-[#FF4D1A]" />
          </div>
          <h1 className="text-3xl font-black mt-6">You're in.</h1>
          <p className="text-[#A1A1A1] mt-2">Welcome to FlameFlix. Time to heat up the night.</p>
          <button onClick={() => navigate("/flix/browse")} className="flix-ember-hover mt-8 bg-[#FF4D1A] hover:bg-[#ff5d30] text-white font-bold px-8 py-3 rounded-md">
            Start Watching
          </button>
        </div>
        <FlixFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      <FlixNav />
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-black text-center">Get in. Get charged.</h1>
        <p className="text-center text-[#A1A1A1] mt-3">One subscription. Every flame. Demo checkout — no card required.</p>

        <div className="grid sm:grid-cols-2 gap-6 mt-12">
          {(["monthly", "annual"] as const).map((key) => {
            const p = FLIX_PLANS[key];
            const selected = plan === key;
            return (
              <button
                key={key}
                onClick={() => setPlan(key)}
                className={`text-left bg-[#141416] rounded-xl p-6 border-2 transition-colors ${selected ? "border-[#FF4D1A]" : "border-[#2A2A2A] hover:border-[#A1A1A1]"}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-black tracking-widest text-sm">{p.label.toUpperCase()}</p>
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "border-[#FF4D1A]" : "border-[#2A2A2A]"}`}>
                    {selected && <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D1A]" />}
                  </span>
                </div>
                <p className="text-4xl font-black mt-4">${p.price}</p>
                <p className="text-[#A1A1A1] text-sm">/{key === "annual" ? "yr" : "mo"}</p>
                <p className="text-[#A1A1A1] text-sm mt-4">{p.note}</p>
                {key === "annual" && <p className="text-[#FFB020] text-xs font-bold mt-2">BEST VALUE — SAVE 58% YEAR ONE</p>}
              </button>
            );
          })}
        </div>

        <ul className="mt-8 space-y-2 max-w-sm mx-auto">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-2 text-sm text-[#F5F5F5]">
              <Check size={16} className="text-[#FF4D1A] shrink-0" /> {perk}
            </li>
          ))}
        </ul>

        {error && <p className="text-red-400 text-sm text-center mt-6">{error}</p>}
        <button
          onClick={subscribe}
          disabled={loading}
          className="flix-ember-hover w-full max-w-md mx-auto mt-8 flex items-center justify-center gap-2 bg-[#FF4D1A] hover:bg-[#ff5d30] disabled:opacity-60 text-white font-bold py-4 rounded-md"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Flame size={18} className="fill-[#FFB020]" />}
          {user ? `Start ${FLIX_PLANS[plan].label} — Demo Checkout` : "Sign In to Subscribe"}
        </button>
        <p className="text-center text-xs text-[#A1A1A1] mt-4">
          Demo mode: no payment is collected. Annual renews at the then-current annual rate (currently $59.99/yr after year one).
        </p>
      </div>
      <FlixFooter />
    </div>
  );
};

export default FlixPricing;
