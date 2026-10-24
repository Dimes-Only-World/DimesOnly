import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, X } from "lucide-react";

interface Found {
  leadId: string;
  username: string;
  visitorType: string | null;
  dobMasked: string;
  photo: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  exotic: "Exotic",
  stripper: "Stripper",
  normal_female: "Normal Female",
  male: "Male",
  business_owner: "Business Owner",
};

const formatPhone = (value: string) => {
  let d = value.replace(/\D/g, "");
  while (d.startsWith("1")) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

const JoinChoiceModal: React.FC<{ onClose: () => void; onNew: () => void; refCode: string }> = ({ onClose, onNew, refCode }) => {
  const [view, setView] = useState<"choose" | "returning" | "notfound">("choose");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<Found | null>(null);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length !== 10) return setError("Please enter a 10-digit phone number");
    setError("");
    setLoading(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("submit-age-gate-lead", { body: { phoneLookup: true, phone } });
      if (err) throw err;
      if (data?.found) setFound(data as Found);
      else setView("notfound");
    } catch {
      setError("We couldn't look that up. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goRegister = () => {
    if (!found) return;
    try {
      sessionStorage.setItem(
        "ageGatePrefill",
        JSON.stringify({ username: found.username, phone, visitorType: found.visitorType || undefined }),
      );
    } catch { /* ignore */ }
    supabase.functions.invoke("submit-age-gate-lead", { body: { leadId: found.leadId, action: "continued_registration" } }).catch(() => {});
    window.location.href = `/register${refCode ? `?ref=${encodeURIComponent(refCode)}` : ""}`;
  };

  const btn = "w-full rounded-lg px-6 py-3 font-bold transition-colors text-sm sm:text-base";
  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm rounded-2xl border-2 border-orange-500 bg-gray-900 p-6 text-white text-center">
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-3 top-3 text-white/60 hover:text-white">
          <X className="h-5 w-5" />
        </button>

        {view === "choose" && (
          <>
            <h3 className="text-xl font-bold text-orange-500 mb-5">Welcome! Are you new or returning?</h3>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={onNew} className={`${btn} bg-orange-500 hover:bg-orange-600`}>I&apos;m New</button>
              <button type="button" onClick={() => setView("returning")} className={`${btn} bg-orange-500 hover:bg-orange-600`}>I&apos;m Returning</button>
            </div>
          </>
        )}

        {view === "returning" && !found && (
          <form onSubmit={lookup}>
            <h3 className="text-xl font-bold text-orange-500 mb-2">Welcome back!</h3>
            <p className="text-sm text-white/70 mb-4">Enter the phone number you used before.</p>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(555) 123-4567"
              className="w-full rounded-lg bg-white/10 border border-white/30 px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-yellow-400"
            />
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            <button type="submit" disabled={loading} className={`${btn} mt-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-60`}>
              {loading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Looking up…</span> : "Find Me"}
            </button>
          </form>
        )}

        {found && (
          <>
            <h3 className="text-xl font-bold text-orange-500 mb-4">We found you!</h3>
            <button type="button" onClick={goRegister} className="w-full flex items-center gap-4 rounded-xl border border-orange-500/60 bg-white/5 p-4 text-left hover:bg-white/10">
              <Avatar className="h-16 w-16 border-2 border-orange-500">
                {found.photo && <AvatarImage src={found.photo} alt={`@${found.username}`} />}
                <AvatarFallback className="bg-orange-500/20 text-lg font-bold">{found.username.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-bold text-orange-300 truncate">@{found.username}</p>
                {found.visitorType && <p className="text-sm text-white/80">{ROLE_LABEL[found.visitorType] || found.visitorType}</p>}
                {found.dobMasked && <p className="text-xs text-white/60">DOB {found.dobMasked}</p>}
                <p className="text-xs text-pink-400 mt-1">Tap to complete registration</p>
              </div>
            </button>
          </>
        )}

        {view === "notfound" && (
          <>
            <h3 className="text-xl font-bold text-orange-500 mb-2">We couldn&apos;t find you</h3>
            <p className="text-sm text-white/70 mb-5">No problem — start fresh.</p>
            <button type="button" onClick={onNew} className={`${btn} bg-orange-500 hover:bg-orange-600`}>Start Fresh</button>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinChoiceModal;
