import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import FlixNav from "@/components/flix/FlixNav";
import FlixRow, { FlixPosterCard } from "@/components/flix/FlixRow";
import FlixHero from "@/components/flix/FlixHero";
import FlixFooter from "@/components/flix/FlixFooter";
import { fetchContinueWatching, fetchLiveTitles, type FlixTitle } from "@/lib/flix";
import { useAppContext } from "@/contexts/AppContext";
import "@/components/flix/flix.css";

const FlixBrowse: React.FC = () => {
  const { user } = useAppContext();
  const [params] = useSearchParams();
  const [titles, setTitles] = useState<FlixTitle[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const sortNew = params.get("sort") === "new";

  useEffect(() => {
    fetchLiveTitles()
      .then(setTitles)
      .catch(() => setTitles([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.id) fetchContinueWatching(user.id).then(setContinueWatching);
  }, [user?.id]);

  const byGenre = (g: string) => titles.filter((t) => t.genres.some((x) => x.toLowerCase() === g.toLowerCase()));
  const progressMap: Record<string, number> = {};
  for (const row of continueWatching) {
    progressMap[row.title_id] = row.duration_seconds > 0 ? (row.seconds / row.duration_seconds) * 100 : 0;
  }

  if (sortNew) {
    const sorted = [...titles].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return (
      <div className="min-h-screen bg-[#0B0B0D] text-white">
        <FlixNav />
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
          <h1 className="text-3xl font-black mb-6">New on FlameFlix</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {loading
              ? [...Array(12)].map((_, i) => <div key={i} className="aspect-[2/3] bg-[#141416] rounded-lg animate-pulse" />)
              : sorted.map((t) => <FlixPosterCard key={t.id} title={t} />)}
          </div>
        </div>
        <FlixFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      <FlixNav />
      {!loading && <FlixHero titles={titles.filter((t) => t.featured).sort((a, b) => a.featured_order - b.featured_order)} />}
      <div className="max-w-[1400px] mx-auto py-10 space-y-12">
        {loading ? (
          <div className="px-4 md:px-8 flex gap-3">{[...Array(6)].map((_, i) => <div key={i} className="w-36 md:w-44 aspect-[2/3] bg-[#141416] rounded-lg animate-pulse shrink-0" />)}</div>
        ) : (
          <>
            {continueWatching.length > 0 && (
              <FlixRow title="Continue Watching" titles={continueWatching.map((r) => r.flix_titles)} progressMap={progressMap} />
            )}
            <FlixRow title="FlameFlix Originals" titles={titles.filter((t) => t.is_original)} />
            <FlixRow title="Trending Now" titles={titles.filter((t) => t.featured)} />
            <FlixRow title="New This Week" titles={[...titles].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 10)} />
            <FlixRow title="Action" titles={byGenre("Action")} />
            <FlixRow title="Drama" titles={byGenre("Drama")} />
            <FlixRow title="Comedy" titles={byGenre("Comedy")} />
            <FlixRow title="After Dark" titles={byGenre("After Dark")} />
            <FlixRow title="Reality" titles={byGenre("Reality")} />
            <FlixRow title="Documentary" titles={byGenre("Documentary")} />
            <FlixRow title="Thriller & Horror" titles={[...byGenre("Thriller"), ...byGenre("Horror")]} />
          </>
        )}
      </div>
      <FlixFooter />
    </div>
  );
};

export default FlixBrowse;
