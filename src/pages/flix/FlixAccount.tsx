import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Plus, Trash2 } from "lucide-react";
import FlixNav from "@/components/flix/FlixNav";
import { FlixPosterCard } from "@/components/flix/FlixRow";
import FlixFooter from "@/components/flix/FlixFooter";
import { fetchMyListIds, fetchMySubscription, fetchLiveTitles, formatCents, toggleMyList, type FlixTitle, type FlixSubscription } from "@/lib/flix";
import { useAppContext } from "@/contexts/AppContext";
import "@/components/flix/flix.css";

const FlixAccount: React.FC = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [sub, setSub] = useState<FlixSubscription | null>(null);
  const [listTitles, setListTitles] = useState<FlixTitle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([fetchMySubscription(user.id), fetchMyListIds(user.id), fetchLiveTitles()])
      .then(([s, ids, all]) => {
        setSub(s);
        setListTitles(all.filter((t) => ids.includes(t.id)));
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-white">
        <FlixNav />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <Flame size={40} className="mx-auto text-[#FF4D1A] fill-[#FFB020]" />
          <h1 className="text-2xl font-black mt-4">Sign in to view your account</h1>
          <button onClick={() => navigate("/login?next=/flix/account")} className="mt-6 bg-[#FF4D1A] hover:bg-[#ff5d30] text-white font-bold px-8 py-3 rounded-md">
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
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-10 space-y-12">
        <section>
          <h1 className="text-3xl font-black">Account</h1>
          <p className="text-[#A1A1A1] mt-1">Signed in as <span className="text-white font-semibold">{user.username}</span></p>
        </section>

        <section className="bg-[#141416] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Subscription</h2>
          {loading ? (
            <div className="h-16 bg-[#0B0B0D] rounded animate-pulse" />
          ) : sub ? (
            <div className="flex flex-wrap items-center gap-4">
              <span className="bg-[#FF4D1A]/20 text-[#FF4D1A] text-xs font-black px-3 py-1 rounded-full uppercase">{sub.status}</span>
              <div>
                <p className="font-bold capitalize">{sub.plan} — {formatCents(sub.amount_cents)}</p>
                {sub.current_period_end && (
                  <p className="text-[#A1A1A1] text-sm">
                    Renews {new Date(sub.current_period_end).toLocaleDateString()}
                    {sub.plan === "annual" && " at the then-current annual rate"}
                  </p>
                )}
                {sub.is_demo && <p className="text-[#A1A1A1] text-xs mt-1">Demo subscription — no billing.</p>}
              </div>
              <button onClick={() => navigate("/flix/pricing")} className="ml-auto text-sm font-semibold text-[#A1A1A1] hover:text-white border border-[#2A2A2A] rounded-md px-4 py-2">
                Manage Plan
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-[#A1A1A1]">No active subscription.</p>
              <button onClick={() => navigate("/flix/pricing")} className="flix-ember-hover bg-[#FF4D1A] hover:bg-[#ff5d30] text-white font-bold px-5 py-2.5 rounded-md">
                Subscribe
              </button>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">My List</h2>
          {loading ? (
            <div className="flex gap-3">{[...Array(4)].map((_, i) => <div key={i} className="w-36 md:w-44 aspect-[2/3] bg-[#141416] rounded-lg animate-pulse shrink-0" />)}</div>
          ) : listTitles.length ? (
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {listTitles.map((t) => (
                <div key={t.id} className="relative group shrink-0">
                  <FlixPosterCard title={t} />
                  <button
                    onClick={async () => {
                      await toggleMyList(user.id!, t.id, true);
                      setListTitles((l) => l.filter((x) => x.id !== t.id));
                    }}
                    className="absolute top-2 right-2 z-10 bg-black/70 hover:bg-black rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove ${t.name} from My List`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#141416] border border-dashed border-[#2A2A2A] rounded-xl p-10 text-center text-[#A1A1A1]">
              <Plus size={28} className="mx-auto mb-3" />
              <p>Your list is empty. Add titles from the browse page.</p>
            </div>
          )}
        </section>
      </div>
      <FlixFooter />
    </div>
  );
};

export default FlixAccount;
