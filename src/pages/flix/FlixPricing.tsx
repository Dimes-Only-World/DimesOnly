import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Check, Flame, Loader2 } from "lucide-react";
import FlixNav from "@/components/flix/FlixNav";
import FlixFooter from "@/components/flix/FlixFooter";
import { FLIX_PLANS, getFlixRefCode, fetchMySubscription } from "@/lib/flix";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import "@/components/flix/flix.css";

const PERKS = ["Unlimited streaming", "Watch on any device", "Support the creators", "Cancel anytime"];

const cancelByDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const FlixPricing: React.FC = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const subscribe = async () => {
    if (!user?.id) {
      navigate("/login?next=/flix/pricing");
      return;
    }
    if (!agreed) {
      setError("Please check the box to agree to the renewal terms.");
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

      const { data, error: fnError } = await supabase.functions.invoke("flix-subscribe", {
        body: { userId: user.id, plan, amountCents: selected.cents, referralCode: refCode || null },
      });
      if (fnError) throw new Error(fnError.message);
      if ((data as any)?.error) throw new Error((data as any).error);
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

        <label className="mt-10 max-w-2xl mx-auto flex items-start gap-3 text-xs leading-relaxed text-[#A1A1A1] cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF4D1A]"
          />
          <span>
            By checking this box, you understand and agree that you are enrolling in a subscription that will
            automatically renew every year at $69.99 (plus any tax) until you cancel. Pricing is subject to change. You
            may cancel your subscription in your Billing Settings or by contacting Customer Support no later than{" "}
            {cancelByDate()}.
          </span>
        </label>

        {error && <p className="text-red-400 text-sm text-center mt-6">{error}</p>}
        <button
          onClick={subscribe}
          disabled={loading || !agreed}
          className="flix-ember-hover w-full max-w-md mx-auto mt-6 flex items-center justify-center gap-2 bg-[#FF4D1A] hover:bg-[#ff5d30] disabled:opacity-60 text-white font-bold py-4 rounded-md"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Flame size={18} className="fill-[#FFB020]" />}
          {user ? "Start subscription" : "Sign In to Subscribe"}
        </button>
        <p className="max-w-2xl mx-auto text-center text-xs text-[#A1A1A1] mt-4">
          By clicking "Start subscription," you agree to our{" "}
          <Link to="/flix/legal/terms" className="text-[#FF4D1A] hover:underline">Terms of Service</Link>, acknowledge
          our{" "}
          <Link to="/flix/legal/privacy" className="text-[#FF4D1A] hover:underline">Privacy Policy</Link>, and authorize
          your payment method to be charged. FlameFlix, Inc.
        </p>

      </div>
      <FlixFooter />
    </div>
  );
};

export default FlixPricing;
