import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, DollarSign, Flame, Link2, Loader2, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import FlixNav from "@/components/flix/FlixNav";
import FlixFooter from "@/components/flix/FlixFooter";
import { FLIX_MIN_PAYOUT_CENTS, formatCents } from "@/lib/flix";
import { supabase } from "@/integrations/supabase/client";
import { useAppContext } from "@/contexts/AppContext";
import "@/components/flix/flix.css";

interface FlixEarning {
  id: string;
  subscription_id: string;
  subscriber_id: string;
  level: number;
  amount_cents: number;
  status: string;
  created_at: string;
}

const FlixEarn: React.FC = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [earnings, setEarnings] = useState<FlixEarning[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase.from("flix_earnings").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("flix_payout_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]).then(([e, p]) => {
      setEarnings((e.data as FlixEarning[]) || []);
      setPayouts(p.data || []);
      setLoading(false);
    });
  }, [user?.id]);

  const totals = useMemo(() => {
    const paidOut = payouts.filter((p) => p.status === "paid").reduce((a, p) => a + p.amount_cents, 0);
    const pendingPayout = payouts.filter((p) => p.status === "pending").reduce((a, p) => a + p.amount_cents, 0);
    const sum = (level?: number, status?: string) =>
      earnings
        .filter((e) => (level === undefined || e.level === level) && (status === undefined || e.status === status))
        .reduce((a, e) => a + e.amount_cents, 0);
    const qualified = sum(undefined, "qualified");
    return {
      lifetime: sum(),
      direct: sum(1),
      override: sum(2),
      pending: sum(undefined, "pending"),
      available: Math.max(0, qualified - paidOut - pendingPayout),
      paidOut,
    };
  }, [earnings, payouts]);

  const chartData = useMemo(() => {
    const months: Record<string, { month: string; direct: number; override: number }> = {};
    for (const e of earnings) {
      const key = new Date(e.created_at).toLocaleString("default", { month: "short", year: "2-digit" });
      months[key] = months[key] || { month: key, direct: 0, override: 0 };
      if (e.level === 1) months[key].direct += e.amount_cents / 100;
      else months[key].override += e.amount_cents / 100;
    }
    return Object.values(months).slice(-8);
  }, [earnings]);

  const referralLink = user?.username ? `${window.location.origin}/register?ref=${user.username}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* denied */
    }
  };

  const requestPayout = async () => {
    if (!user?.id) return;
    setRequesting(true);
    setMessage("");
    try {
      const { error } = await supabase.from("flix_payout_requests").insert({
        user_id: user.id,
        amount_cents: totals.available,
        status: "pending",
      });
      if (error) throw error;
      setMessage("Payout request submitted. FlameFlix processes payouts within 14 days.");
      const { data } = await supabase.from("flix_payout_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setPayouts(data || []);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setRequesting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-white">
        <FlixNav />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <Flame size={40} className="mx-auto text-[#FF4D1A] fill-[#FFB020]" />
          <h1 className="text-2xl font-black mt-4">Join Dimes Only to earn</h1>
          <p className="text-[#A1A1A1] mt-2">Earn 10% residual + 5% override on every FlameFlix subscription you spark.</p>
          <button onClick={() => navigate("/login?next=/flix/earn")} className="mt-6 bg-[#FF4D1A] hover:bg-[#ff5d30] text-white font-bold px-8 py-3 rounded-md">
            Sign In
          </button>
        </div>
        <FlixFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      <FlixNav />
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-10 space-y-10">
        <div>
          <h1 className="text-3xl font-black">Dimes Only × FlameFlix Earnings</h1>
          <p className="text-[#A1A1A1] mt-1">10% direct residual + 5% override on every sub you spark — every billing cycle.</p>
        </div>

        <section className="bg-[#141416] border border-[#FF4D1A]/30 rounded-xl p-6">
          <p className="text-sm font-bold text-[#A1A1A1] mb-2 flex items-center gap-2"><Link2 size={16} /> Your referral link</p>
          <div className="flex flex-wrap gap-3">
            <code className="flex-1 min-w-0 bg-[#0B0B0D] border border-[#2A2A2A] rounded-md px-4 py-3 text-sm truncate">{referralLink}</code>
            <button onClick={copyLink} className="flix-ember-hover flex items-center gap-2 bg-[#FF4D1A] hover:bg-[#ff5d30] text-white font-bold px-5 py-2.5 rounded-md">
              <Copy size={16} /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, label: "Lifetime Earnings", value: totals.lifetime },
            { icon: Users, label: "Direct Referrals (10%)", value: totals.direct },
            { icon: TrendingUp, label: "Overrides (5%)", value: totals.override },
            { icon: Flame, label: "Available", value: totals.available },
          ].map((s) => (
            <div key={s.label} className="bg-[#141416] border border-[#2A2A2A] rounded-xl p-5">
              <s.icon size={20} className="text-[#FF4D1A]" />
              <p className="text-2xl font-black mt-3">{formatCents(s.value)}</p>
              <p className="text-[#A1A1A1] text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </section>

        {chartData.length > 0 && (
          <section className="bg-[#141416] border border-[#2A2A2A] rounded-xl p-6">
            <h2 className="font-bold mb-4">Earnings over time</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="month" stroke="#A1A1A1" fontSize={12} />
                  <YAxis stroke="#A1A1A1" fontSize={12} />
                  <Tooltip contentStyle={{ background: "#141416", border: "1px solid #2A2A2A" }} labelStyle={{ color: "#fff" }} />
                  <Bar dataKey="direct" stackId="a" fill="#FF4D1A" name="Direct" />
                  <Bar dataKey="override" stackId="a" fill="#FFB020" name="Override" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <section className="bg-[#141416] border border-[#2A2A2A] rounded-xl p-6 flex flex-wrap items-center gap-4">
          <div>
            <p className="font-bold">Request a payout</p>
            <p className="text-[#A1A1A1] text-sm">Minimum {formatCents(FLIX_MIN_PAYOUT_CENTS)}. Payouts are for qualified earnings only.</p>
            {message && <p className="text-[#FFB020] text-sm mt-2">{message}</p>}
          </div>
          <button
            onClick={requestPayout}
            disabled={requesting || totals.available < FLIX_MIN_PAYOUT_CENTS}
            className="ml-auto flex items-center gap-2 bg-[#FF4D1A] hover:bg-[#ff5d30] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-md"
          >
            {requesting && <Loader2 size={16} className="animate-spin" />}
            Request {formatCents(totals.available)}
          </button>
        </section>

        <section className="bg-[#141416] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="font-bold mb-4">Payout history</h2>
          {payouts.length ? (
            <ul className="divide-y divide-[#2A2A2A]">
              {payouts.map((p) => (
                <li key={p.id} className="py-3 flex items-center justify-between text-sm">
                  <span>{formatCents(p.amount_cents)}</span>
                  <span className="text-[#A1A1A1]">{new Date(p.created_at).toLocaleDateString()}</span>
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${p.status === "paid" ? "bg-green-500/20 text-green-400" : "bg-[#FFB020]/20 text-[#FFB020]"}`}>{p.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[#A1A1A1] text-sm">No payout requests yet.</p>
          )}
        </section>
      </div>
      <FlixFooter />
    </div>
  );
};

export default FlixEarn;
