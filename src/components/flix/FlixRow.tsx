import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { flixImage, type FlixTitle } from "@/lib/flix";

export const FlixPosterCard: React.FC<{ title: FlixTitle; progress?: number }> = ({ title, progress }) => {
  const navigate = useNavigate();
  const isNew = Date.now() - new Date(title.created_at).getTime() < 1000 * 60 * 60 * 24 * 30;
  return (
    <button
      onClick={() => navigate(`/flix/title/${title.id}`)}
      className="flix-poster-card relative shrink-0 w-36 md:w-44 text-left rounded-lg overflow-hidden bg-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D1A] snap-start"
      aria-label={title.name}
    >
      <div className="relative aspect-[2/3]">
        <img src={flixImage(title, "poster")} alt={`${title.name} poster`} loading="lazy" width={512} height={768} className="w-full h-full object-cover" />
        {title.coming_soon ? (
          <span className="absolute top-2 left-2 flex items-center gap-1 border border-[#FFB020]/70 bg-[#0B0B0D]/90 text-[#FFB020] text-[10px] font-black px-2 py-1 rounded shadow-lg backdrop-blur-sm">
            <CalendarClock size={10} /> COMING SOON
          </span>
        ) : title.is_original && (
          <span className="absolute top-2 left-2 flex items-center gap-1 bg-[#FF4D1A] text-white text-[10px] font-black px-2 py-0.5 rounded">
            <Flame size={10} className="fill-[#FFB020]" /> ORIGINAL
          </span>
        )}
        {isNew && !title.is_original && !title.coming_soon && (
          <span className="absolute top-2 left-2 bg-[#FFB020] text-black text-[10px] font-black px-2 py-0.5 rounded">NEW</span>
        )}
        <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{title.rating}</span>
        {typeof progress === "number" && progress > 0 && (
          <span className="absolute bottom-0 inset-x-0 h-1 bg-[#2A2A2A]">
            <span className="block h-full bg-[#FF4D1A]" style={{ width: `${Math.min(100, progress)}%` }} />
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="text-white text-xs font-bold truncate">{title.name}</p>
        <p className="text-[#A1A1A1] text-[10px] truncate">{title.genres.join(" · ")}</p>
      </div>
    </button>
  );
};

interface FlixRowProps {
  title: string;
  titles: FlixTitle[];
  progressMap?: Record<string, number>;
}

const FlixRow: React.FC<FlixRowProps> = ({ title, titles, progressMap }) => {
  const ref = useRef<HTMLDivElement>(null);
  if (!titles.length) return null;
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 600, behavior: "smooth" });
  return (
    <section className="relative" aria-label={title}>
      <div className="flex items-center justify-between px-4 md:px-8 mb-3">
        <h2 className="text-white text-lg md:text-xl font-bold">{title}</h2>
        <div className="hidden md:flex gap-2">
          <button onClick={() => scroll(-1)} className="p-1.5 rounded-full bg-[#141416] text-[#A1A1A1] hover:text-white" aria-label={`Scroll ${title} left`}>
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => scroll(1)} className="p-1.5 rounded-full bg-[#141416] text-[#A1A1A1] hover:text-white" aria-label={`Scroll ${title} right`}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div ref={ref} className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-2 snap-x scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {titles.map((t) => (
          <FlixPosterCard key={t.id} title={t} progress={progressMap?.[t.id]} />
        ))}
      </div>
    </section>
  );
};

export default FlixRow;
