import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Play } from "lucide-react";
import { flixImage, type FlixTitle } from "@/lib/flix";

interface FlixHeroProps {
  titles: FlixTitle[];
}

/** Auto-rotating cinematic hero of featured titles. */
const FlixHero: React.FC<FlixHeroProps> = ({ titles }) => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    if (titles.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % titles.length), 8000);
    return () => clearInterval(t);
  }, [titles.length]);

  // Pause and silence every slide except the active one.
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === index % titles.length) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.muted = true;
      }
    });
  }, [index, titles.length]);

  if (!titles.length) return null;
  const current = titles[index % titles.length];

  return (
    <section className="relative h-[70vh] min-h-[420px] w-full overflow-hidden bg-black" aria-label="Featured titles">
      {titles.map((t, i) => (
        <div key={t.id} className={`absolute inset-0 transition-opacity duration-1000 ${i === index % titles.length ? "opacity-100" : "opacity-0"}`}>
          {t.trailer_url ? (
            <video
              key={t.id}
              ref={(el) => { videoRefs.current[i] = el; }}
              autoPlay={i === index % titles.length}
              muted={muted}
              loop
              playsInline
              poster={flixImage(t, "backdrop")}
              className="w-full h-full object-cover"
            >
              <source src={t.trailer_url} type="video/mp4" />
            </video>
          ) : (
            <img src={flixImage(t, "backdrop")} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-[#0B0B0D]/40 to-[#0B0B0D]/30" />
      <div className="absolute inset-x-0 bottom-0 px-4 md:px-8 pb-10 md:pb-16 max-w-[1400px] mx-auto">
        <div className="max-w-xl">
          {current.is_original && (
            <p className="flex items-center gap-1.5 text-[#FFB020] text-xs font-black tracking-widest mb-3">
              <Flame size={14} className="fill-[#FF4D1A] text-[#FF4D1A]" /> A FLAMEFLIX ORIGINAL
            </p>
          )}
          <h1 className="text-white text-4xl md:text-6xl font-black leading-tight drop-shadow-lg">{current.name}</h1>
          <p className="text-[#F5F5F5] mt-3 text-sm md:text-base drop-shadow line-clamp-2">{current.logline}</p>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => navigate(`/flix/watch/${current.id}`)}
              className="flix-ember-hover flex items-center gap-2 bg-[#FF4D1A] hover:bg-[#ff5d30] text-white font-bold px-6 py-3 rounded-md"
            >
              <Play size={18} className="fill-current" /> Watch Now
            </button>
            <button
              onClick={() => navigate(`/flix/title/${current.id}`)}
              className="flex items-center gap-2 bg-[#2A2A2A]/80 hover:bg-[#3A3A3A] text-white font-bold px-6 py-3 rounded-md transition-colors"
            >
              Start Free Preview
            </button>
            <span className="text-[#FFB020] text-sm font-bold">$5.99/mo · $29.99 first year</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-8">
          {titles.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Featured title ${i + 1}`}
              className={`h-1 rounded-full transition-all ${i === index % titles.length ? "w-8 bg-[#FF4D1A]" : "w-4 bg-[#2A2A2A] hover:bg-[#A1A1A1]"}`}
            />
          ))}
          <button onClick={() => setMuted(!muted)} className="ml-auto text-[#A1A1A1] hover:text-white text-xs font-semibold border border-[#2A2A2A] rounded-full px-3 py-1">
            {muted ? "Unmute" : "Mute"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default FlixHero;
