import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Flame, Play, Plus, Share2 } from "lucide-react";
import FlixNav from "@/components/flix/FlixNav";
import FlixRow from "@/components/flix/FlixRow";
import FlixFooter from "@/components/flix/FlixFooter";
import FlixPaywall from "@/components/flix/FlixPaywall";
import { fetchLiveTitles, fetchMyListIds, fetchMySubscription, fetchTitle, formatDuration, toggleMyList, type FlixTitle } from "@/lib/flix";
import { useAppContext } from "@/contexts/AppContext";
import "@/components/flix/flix.css";

const FlixTitlePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [title, setTitle] = useState<FlixTitle | null>(null);
  const [allTitles, setAllTitles] = useState<FlixTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [inList, setInList] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchTitle(id), fetchLiveTitles()])
      .then(([t, all]) => {
        setTitle(t);
        setAllTitles(all);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user?.id || !id) return;
    fetchMyListIds(user.id).then((ids) => setInList(ids.includes(id)));
    fetchMySubscription(user.id).then((s) => setSubscribed(!!s));
  }, [user?.id, id]);

  const related = useMemo(
    () => (title ? allTitles.filter((t) => t.id !== title.id && t.genres.some((g) => title.genres.includes(g))).slice(0, 10) : []),
    [title, allTitles],
  );

  const handleMyList = async () => {
    if (!user?.id) return navigate("/login?next=/flix/title/" + id);
    await toggleMyList(user.id, id!, inList);
    setInList(!inList);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied */
    }
  };

  const handleWatch = () => {
    if (!user) return navigate("/flix/pricing");
    if (!subscribed) return setShowPaywall(true);
    navigate(`/flix/watch/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0D]">
        <FlixNav />
        <div className="h-[60vh] bg-[#141416] animate-pulse" />
      </div>
    );
  }

  if (!title) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-white">
        <FlixNav />
        <div className="max-w-[1400px] mx-auto px-4 py-24 text-center text-[#A1A1A1]">
          <h1 className="text-2xl font-bold text-white mb-2">Title not found</h1>
          <p>It may have been removed or is still in the vault.</p>
        </div>
        <FlixFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      <FlixNav />
      <div className="relative">
        <div className="relative aspect-video max-h-[70vh] w-full overflow-hidden bg-black">
          <video
            key={title.id}
            autoPlay
            muted
            loop
            playsInline
            poster={title.backdrop_url}
            className="w-full h-full object-cover"
          >
            {title.trailer_url && <source src={title.trailer_url} type="video/mp4" />}
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-transparent to-[#0B0B0D]/60" />
        </div>
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 -mt-24 relative z-10">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10">
            <img
              src={title.poster_url}
              alt={`${title.name} poster`}
              width={512}
              height={768}
              className="w-40 md:w-56 rounded-lg shadow-2xl shrink-0"
            />
            <div className="flex-1 md:pt-16">
              {title.is_original && (
                <p className="flex items-center gap-1.5 text-[#FFB020] text-xs font-black tracking-widest mb-2">
                  <Flame size={14} className="fill-[#FF4D1A] text-[#FF4D1A]" /> A FLAMEFLIX ORIGINAL
                </p>
              )}
              <h1 className="text-3xl md:text-5xl font-black">{title.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-[#A1A1A1]">
                <span className="border border-[#2A2A2A] px-2 py-0.5 rounded text-xs font-bold">{title.rating}</span>
                <span>{title.year}</span>
                <span>{formatDuration(title.duration_minutes)}</span>
                <span>{title.genres.join(" · ")}</span>
              </div>
              <div className="flex flex-wrap gap-3 mt-6">
                <button onClick={handleWatch} className="flix-ember-hover flex items-center gap-2 bg-[#FF4D1A] hover:bg-[#ff5d30] text-white font-bold px-6 py-3 rounded-md">
                  <Play size={18} className="fill-current" /> Watch Now
                </button>
                <button onClick={handleMyList} className="flex items-center gap-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white font-bold px-5 py-3 rounded-md transition-colors">
                  {inList ? <Check size={18} className="text-[#FFB020]" /> : <Plus size={18} />} My List
                </button>
                <button onClick={handleShare} className="flex items-center gap-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white font-bold px-5 py-3 rounded-md transition-colors">
                  {copied ? <Check size={18} className="text-[#FFB020]" /> : <Share2 size={18} />} {copied ? "Copied" : "Share"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 max-w-3xl">
            <p className="text-[#F5F5F5] leading-relaxed">{title.description}</p>
            {title.cast_members.length > 0 && (
              <p className="mt-4 text-sm text-[#A1A1A1]">
                <span className="text-white font-semibold">Starring: </span>
                {title.cast_members.join(", ")}
              </p>
            )}
            {title.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {title.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-[#141416] border border-[#2A2A2A] text-[#A1A1A1] px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto py-12">
        <FlixRow title="More Like This" titles={related} />
      </div>
      <FlixFooter />
      {showPaywall && <FlixPaywall titleName={title.name} onClose={() => setShowPaywall(false)} />}
    </div>
  );
};

export default FlixTitlePage;
