import React, { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import FlixNav from "@/components/flix/FlixNav";
import { FlixPosterCard } from "@/components/flix/FlixRow";
import FlixFooter from "@/components/flix/FlixFooter";
import { fetchLiveTitles, type FlixTitle } from "@/lib/flix";
import "@/components/flix/flix.css";

const FlixSearch: React.FC = () => {
  const [titles, setTitles] = useState<FlixTitle[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveTitles()
      .then(setTitles)
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return titles;
    return titles.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.genres.some((g) => g.toLowerCase().includes(q)) ||
        t.cast_members.some((c) => c.toLowerCase().includes(q)) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [query, titles]);

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white">
      <FlixNav />
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        <div className="relative max-w-xl">
          <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A1A1A1]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, genres, or cast"
            aria-label="Search FlameFlix"
            className="w-full bg-[#141416] border border-[#2A2A2A] rounded-full py-3 pl-12 pr-4 text-white placeholder:text-[#A1A1A1] focus:outline-none focus:ring-2 focus:ring-[#FF4D1A]"
          />
        </div>
        <p className="text-[#A1A1A1] text-sm mt-4">{query ? `${results.length} result${results.length === 1 ? "" : "s"} for "${query}"` : "Browse the full FlameFlix catalog"}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-6">
          {loading
            ? [...Array(12)].map((_, i) => <div key={i} className="aspect-[2/3] bg-[#141416] rounded-lg animate-pulse" />)
            : results.map((t) => <FlixPosterCard key={t.id} title={t} />)}
        </div>
        {!loading && results.length === 0 && (
          <div className="text-center py-24 text-[#A1A1A1]">
            <p className="text-white text-xl font-bold mb-2">No matches found</p>
            <p>Try a different title, genre, or cast member.</p>
          </div>
        )}
      </div>
      <FlixFooter />
    </div>
  );
};

export default FlixSearch;
