import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, MonitorSmartphone, Tv, Smartphone, Laptop, Infinity as InfinityIcon, HandHeart, Users } from "lucide-react";
import FlixNav from "@/components/flix/FlixNav";
import FlixHero from "@/components/flix/FlixHero";
import FlixRow from "@/components/flix/FlixRow";
import FlixFooter from "@/components/flix/FlixFooter";
import FlixIntro, { shouldShowFlixIntro } from "@/components/flix/FlixIntro";
import { fetchLiveTitles, type FlixTitle } from "@/lib/flix";
import "@/components/flix/flix.css";

const DEVICES = [
  { icon: Smartphone, label: "Phone" },
  { icon: MonitorSmartphone, label: "Tablet" },
  { icon: Laptop, label: "Web" },
  { icon: Tv, label: "TV" },
];

const PERKS = [
  { icon: InfinityIcon, title: "Unlimited streaming", body: "Get streaming access to all the content and all future releases." },
  { icon: MonitorSmartphone, title: "Watch anywhere", body: "Enjoy on your favorite device — phone, tablet, web, or TV." },
  { icon: HandHeart, title: "Support the creators", body: "Directly support the creators and help them bring you more heat." },
];

const FlixLanding: React.FC = () => {
  const [titles, setTitles] = useState<FlixTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(shouldShowFlixIntro());

  useEffect(() => {
    fetchLiveTitles()
      .then(setTitles)
      .catch(() => setTitles([]))
      .finally(() => setLoading(false));
  }, []);

  const featured = titles.filter((t) => t.featured).sort((a, b) => a.featured_order - b.featured_order);
  const byGenre = (g: string) => titles.filter((t) => t.genres.some((x) => x.toLowerCase() === g.toLowerCase()));
  const newThisWeek = [...titles].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 10);

  if (showIntro) return <FlixIntro onDone={() => setShowIntro(false)} />;

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      <FlixNav />
      {loading ? (
        <div className="h-[70vh] min-h-[420px] bg-[#141416] animate-pulse" />
      ) : (
        <FlixHero titles={featured.length ? featured : titles.slice(0, 4)} />
      )}

      <div className="max-w-[1400px] mx-auto py-10 space-y-12">
        {loading ? (
          <div className="px-4 md:px-8 flex gap-3">{[...Array(6)].map((_, i) => <div key={i} className="w-36 md:w-44 aspect-[2/3] bg-[#141416] rounded-lg animate-pulse shrink-0" />)}</div>
        ) : (
          <>
            <FlixRow title="FlameFlix Originals" titles={titles.filter((t) => t.is_original)} />
            <FlixRow title="Trending Now" titles={titles.filter((t) => t.featured)} />
            <FlixRow title="New This Week" titles={newThisWeek} />
          </>
        )}

        <section className="grid md:grid-cols-3 gap-8 px-4 md:px-8 py-8 border-y border-[#2A2A2A]">
          {PERKS.map((p) => (
            <div key={p.title} className="text-center">
              <p.icon size={28} className="mx-auto text-[#FF4D1A]" />
              <h3 className="font-black tracking-wide mt-3 uppercase text-sm">{p.title}</h3>
              <p className="text-[#A1A1A1] text-sm mt-2">{p.body}</p>
            </div>
          ))}
        </section>

        <h2 className="text-center text-3xl md:text-4xl font-black px-4">
          Get in. Get charged. <span className="text-[#FF4D1A]">Get FlameFlix.</span>
        </h2>
        <p className="text-center text-[#A1A1A1] -mt-8">Here is some of the heat you're missing.</p>

        {!loading && (
          <>
            <FlixRow title="Action" titles={byGenre("Action")} />
            <FlixRow title="Drama" titles={byGenre("Drama")} />
            <FlixRow title="Comedy" titles={byGenre("Comedy")} />
            <FlixRow title="After Dark" titles={byGenre("After Dark")} />
          </>
        )}

        {/* Devices strip */}
        <section className="text-center py-10 px-4">
          <h2 className="text-3xl md:text-4xl font-black">Anywhere. Anytime.</h2>
          <p className="text-[#A1A1A1] mt-2">No cable box needed. Your favorite heat, available wherever you want.</p>
          <div className="flex flex-wrap justify-center gap-8 mt-8">
            {DEVICES.map((d) => (
              <div key={d.label} className="flex flex-col items-center gap-2 text-[#A1A1A1]">
                <d.icon size={36} className="text-white" />
                <span className="text-xs font-semibold">{d.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing preview */}
        <section className="px-4 md:px-8">
          <h2 className="text-center text-3xl md:text-4xl font-black">Subscribe now!</h2>
          <p className="text-center text-[#A1A1A1] mt-2">Ready to watch FlameFlix everywhere?</p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto mt-8">
            <div className="bg-[#141416] border border-[#2A2A2A] rounded-xl p-8 text-center">
              <p className="font-black tracking-widest text-sm">MONTHLY</p>
              <Link to="/flix/pricing" className="flix-ember-hover inline-block mt-4 bg-[#FF4D1A] hover:bg-[#ff5d30] text-white font-bold px-6 py-2.5 rounded-md">
                SUBSCRIBE $5.99/mo
              </Link>
              <p className="text-[#A1A1A1] text-sm mt-4">Charged once per month. Cancel anytime.</p>
            </div>
            <div className="bg-[#141416] border border-[#FFB020]/40 rounded-xl p-8 text-center">
              <p className="font-black tracking-widest text-sm text-[#FFB020]">ANNUAL · FIRST YEAR</p>
              <Link to="/flix/pricing" className="flix-ember-hover inline-block mt-4 bg-[#FF4D1A] hover:bg-[#ff5d30] text-white font-bold px-6 py-2.5 rounded-md">
                SUBSCRIBE $29.99/yr
              </Link>
              <p className="text-[#A1A1A1] text-sm mt-4">Only $2.50 per month! Renews at the then-current annual rate.</p>
            </div>
          </div>
        </section>

        {/* Dimes Only earn teaser */}
        <section className="mx-4 md:mx-8 rounded-2xl bg-gradient-to-r from-[#1A0B06] to-[#141416] border border-[#FF4D1A]/30 p-8 md:p-12 flex flex-col md:flex-row items-center gap-6">
          <Users size={48} className="text-[#FFB020] shrink-0" />
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-black">Join Dimes Only. Earn while they watch.</h3>
            <p className="text-[#A1A1A1] mt-2">Earn 10% residual + 5% override on every sub you spark. Your link, your money, every billing cycle.</p>
          </div>
          <Link to="/flix/earn" className="flix-ember-hover shrink-0 bg-[#FF4D1A] hover:bg-[#ff5d30] text-white font-bold px-6 py-3 rounded-md flex items-center gap-2">
            <Flame size={16} className="fill-[#FFB020]" /> Start Earning
          </Link>
        </section>
      </div>
      <FlixFooter />
    </div>
  );
};

export default FlixLanding;
