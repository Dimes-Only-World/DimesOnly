import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type PromoSlide = {
  id: string;
  title: string; // Big headline (fallback if titleLines not provided)
  titleLines?: string[]; // Multi-line headline
  highlightLineIndex?: number; // which line in titleLines to accent
  kicker?: string; // Small label above headline
  subcopy?: string; // Support text
  pills?: string[]; // small chip highlights under the subcopy
  footnote?: string; // tiny line under CTAs
  ctaSubtext?: string; // tiny line directly under the primary CTA
  ctaLabel: string;
  ctaHref: string;
  // asset inputs
  bgImage?: string; // background image
  overlayImage?: string; // optional foreground image (model)
  overlayImages?: string[]; // multiple models (right side layering)
  overlayLayouts?: { src: string; className?: string; alt?: string; showOnMobile?: boolean; mobileClassName?: string }[]; // fine control per overlay
  stickerImage?: string; // small sticker near headline (e.g., lottery icon)
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
  // theme
  accent?: "yellow" | "violet" | "green" | "red" | "blue" | "pink";
};

interface HomePromoRailProps {
  className?: string;
  autoPlayMs?: number; // default 6s
  slides?: PromoSlide[]; // allow overriding via props if desired
}

const defaultSlides: PromoSlide[] = [
  {
    id: "tip-win",
    kicker: "Daily Prizes",
    title: "Tip & Win",
    subcopy: "Tip your favorite Dimes and collect jackpot tickets.",
    ctaLabel: "Start Tipping",
    ctaHref: "/tip-girls",
    bgImage:
      "https://dimesonly.s3.us-east-2.amazonaws.com/promo/bg-default-1.jpg",
    overlayImage:
      "https://dimesonly.s3.us-east-2.amazonaws.com/promo/model-default-1.png",
    accent: "yellow",
  },
  {
    id: "events",
    kicker: "Free Concerts",
    title: "Events All Summer",
    subcopy: "RSVP to upcoming free concert events in your city.",
    ctaLabel: "Browse Events",
    ctaHref: "/events",
    bgImage:
      "https://dimesonly.s3.us-east-2.amazonaws.com/promo/bg-default-2.jpg",
    overlayImage:
      "https://dimesonly.s3.us-east-2.amazonaws.com/promo/model-default-2.png",
    accent: "violet",
  },
  {
    id: "flame-flix",
    kicker: "Streaming",
    title: "Flame Flix",
    subcopy: "Originals, shows and more coming to Tronix Network.",
    ctaLabel: "Watch Previews",
    ctaHref: "/flame-flix",
    bgImage:
      "https://dimesonly.s3.us-east-2.amazonaws.com/promo/bg-default-3.jpg",
    overlayImage:
      "https://dimesonly.s3.us-east-2.amazonaws.com/promo/model-default-3.png",
    accent: "green",
  },
  {
    id: "housing-angels",
    kicker: "Tronix Presents",
    title: "Housing Angels",
    subcopy: "A reality show experience—casting updates and more.",
    ctaLabel: "Learn More",
    ctaHref: "/housing-angels",
    bgImage:
      "https://dimesonly.s3.us-east-2.amazonaws.com/promo/bg-default-4.jpg",
    overlayImage:
      "https://dimesonly.s3.us-east-2.amazonaws.com/promo/model-default-4.png",
    accent: "red",
  },
];

const accentStyles: Record<NonNullable<PromoSlide["accent"]>, string> = {
  yellow: "from-yellow-400 to-amber-500",
  violet: "from-violet-500 to-fuchsia-500",
  green: "from-emerald-400 to-green-600",
  red: "from-rose-500 to-red-600",
  blue: "from-sky-500 to-indigo-600",
  pink: "from-pink-500 to-rose-500",
};

const HomePromoRail: React.FC<HomePromoRailProps> = ({
  className,
  autoPlayMs = 6000,
  slides,
}) => {
  const data = useMemo(() => slides && slides.length > 0 ? slides : defaultSlides, [slides]);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!autoPlayMs) return;
    timerRef.current && window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % data.length);
    }, autoPlayMs);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [autoPlayMs, data.length]);

  const go = (i: number) => setIndex((i + data.length) % data.length);

  const current = data[index];
  const accent = current.accent || "yellow";
  const grad = accentStyles[accent];

  return (
    <section className={cn("w-full bg-black", className)} aria-label="Promotions">
      {/* local keyframes for shimmer underline */}
      <style>
        {`
          @keyframes shimmer {
            0% { transform: translateX(-30%); }
            100% { transform: translateX(130%); }
          }
        `}
      </style>
      <div className="relative w-full overflow-hidden">
        {/* Billboard ratio: taller on mobile to fit all copy; desktop 21:9 unchanged */}
        <div className="relative w-full h-0 pb-[140%] sm:pb-[42.85%]">
          {/* Background image */}
          {current.bgImage && (
            <img
              src={current.bgImage}
              alt="promo background"
              className="absolute inset-0 w-full h-full object-cover opacity-70 z-[1]"
            />
          )}
          {/* Dark overlay + gradient accent */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent z-[1]" />
          <div className={cn("absolute inset-0 bg-gradient-to-b opacity-40 pointer-events-none z-[1]", grad)} />

          {/* Foreground model/subject (single) */}
          {current.overlayImage && !current.overlayImages && !current.overlayLayouts && (
            <img
              src={current.overlayImage}
              alt="promo artwork"
              className="absolute right-2 bottom-0 h-[110%] object-contain drop-shadow-2xl hidden sm:block z-[2]"
            />
          )}
          {/* Foreground models with custom layouts (preferred) */}
          {current.overlayLayouts && current.overlayLayouts.length > 0 && (
            <>
              {current.overlayLayouts.map((it, i) => (
                <React.Fragment key={(it.src || "") + i}>
                  {/* Mobile version (only shows on < sm) */}
                  <img
                    src={it.src}
                    alt={it.alt || `promo artwork ${i + 1}`}
                    className={cn(
                      "absolute bottom-0 h-[110%] object-contain drop-shadow-2xl z-[2]",
                      it.showOnMobile ? "block" : "hidden",
                      "sm:hidden",
                      it.mobileClassName
                    )}
                  />
                  {/* Desktop version (>= sm) uses desktop className exactly as provided */}
                  <img
                    src={it.src}
                    alt={it.alt || `promo artwork ${i + 1}`}
                    className={cn(
                      "absolute bottom-0 h-[110%] object-contain drop-shadow-2xl z-[2] hidden sm:block",
                      it.className
                    )}
                  />
                </React.Fragment>
              ))}
            </>
          )}
          {/* Foreground models (multiple, legacy) */}
          {current.overlayImages && current.overlayImages.length > 0 && (
            <>
              {current.overlayImages.map((src, i) => (
                <img
                  key={src + i}
                  src={src}
                  alt={`promo artwork ${i + 1}`}
                  className={cn(
                    "absolute bottom-0 object-contain drop-shadow-2xl hidden sm:block z-[2]",
                    i === 0 && "right-2 h-[108%]",
                    i === 1 && "right-[18%] h-[95%] opacity-95",
                    i === 2 && "right-[34%] h-[90%] opacity-90"
                  )}
                />
              ))}
            </>
          )}

          {/* Copy block */}
          <div className="absolute left-4 sm:left-8 top-10 sm:top-1/2 translate-y-0 sm:-translate-y-1/2 max-w-[62%] sm:max-w-[55%] z-[3]">
            {current.kicker && (
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex items-center px-4 py-2 rounded-full text-sm sm:text-base font-bold text-black bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 shadow-[0_0_30px_rgba(255,200,0,0.4)] ring-2 ring-white/20 transform hover:scale-105 transition-transform">
                  <span className="tracking-wide drop-shadow-sm">{current.kicker}</span>
                </div>
                {current.secondaryCtaLabel && current.secondaryCtaHref && (
                  <Button
                    variant="secondary"
                    onClick={() => (window.location.href = current.secondaryCtaHref!)}
                    className="sm:hidden inline-flex px-3 py-1.5 text-xs rounded-full bg-white/20 text-white border border-white/40 hover:bg-white/30 shadow-md backdrop-blur"
                  >
                    {current.secondaryCtaLabel}
                  </Button>
                )}
              </div>
            )}
            {current.stickerImage && (
              <img
                src={current.stickerImage}
                alt="promo sticker"
                className="inline-block align-middle h-8 sm:h-10 md:h-12 mr-3 drop-shadow-md"
              />
            )}
            {current.titleLines && current.titleLines.length > 0 ? (
              <div className="text-white font-extrabold leading-[1.05] tracking-tight text-3xl xs:text-4xl sm:text-6xl md:text-7xl lg:text-8xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.75)]">
                {current.titleLines.map((ln, i) => (
                  <div key={i} className="block relative">
                    {i === current.highlightLineIndex ? (
                      <span
                        className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 drop-shadow-[0_0_20px_rgba(255,200,0,0.35)]"
                        style={{ WebkitTextStroke: "0.6px rgba(0,0,0,0.45)" }}
                      >
                        {ln}
                      </span>
                    ) : (
                      <span style={{ WebkitTextStroke: "0.6px rgba(0,0,0,0.45)" }}>{ln}</span>
                    )}
                    {i === current.titleLines.length - 1 && (
                      <div className="mt-1 h-1.5 w-[58%] rounded-full overflow-hidden bg-white/15">
                        <div
                          className="h-full w-1/3 bg-gradient-to-r from-white/0 via-white to-white/0"
                          style={{ animation: "shimmer 2.2s linear infinite" }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <h2 className="text-white font-extrabold leading-tight tracking-tight text-3xl xs:text-4xl sm:text-6xl md:text-7xl lg:text-8xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.75)]">
                {current.title}
              </h2>
            )}
            {current.subcopy && (
              <p className="text-white/90 text-sm sm:text-base md:text-lg mt-3 max-w-[60ch]">
                {current.subcopy}
              </p>
            )}
            {current.pills && current.pills.length > 0 && (
              <div className="mt-3 flex flex-col sm:flex-row flex-wrap gap-2">
                {current.pills.map((t, i) => (
                  <span
                    key={i}
                    className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-white/10 text-white/90 border border-white/20 backdrop-blur w-max"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-wrap">
              <Button
                onClick={() => (window.location.href = current.ctaHref)}
                className={cn(
                  "relative overflow-hidden group",
                  "text-black font-extrabold px-4 py-3 text-[13px] sm:text-lg sm:px-7 sm:py-7 rounded-2xl shadow-2xl w-auto",
                  "bg-gradient-to-r ring-2 sm:ring-4 ring-white/20",
                  grad,
                  "hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-yellow-300/30"
                )}
              >
                <span className="relative z-[1] flex items-center gap-2">
                  {current.ctaLabel}
                  <span className="text-black/70 group-hover:translate-x-0.5 transition">›</span>
                </span>
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-white/10" />
              </Button>
              {current.secondaryCtaLabel && current.secondaryCtaHref && (
                <Button
                  variant="secondary"
                  onClick={() => (window.location.href = current.secondaryCtaHref!)}
                  className="hidden sm:inline-flex bg-white/20 text-white border border-white/40 hover:bg-white/30 px-4 py-3 text-[13px] sm:text-lg sm:px-7 sm:py-7 rounded-2xl shadow-xl backdrop-blur w-auto"
                >
                  {current.secondaryCtaLabel}
                </Button>
              )}
            </div>
            {current.ctaSubtext && (
              <p className="text-white/90 text-xs sm:text-sm md:text-base mt-2 whitespace-pre-line">{current.ctaSubtext}</p>
            )}
            {current.footnote && (
              <p className="text-white/85 text-xs sm:text-sm md:text-base mt-2 max-w-[70ch] whitespace-pre-line">
                {current.footnote}
              </p>
            )}
          </div>
        </div>

        {/* Mobile-only strip removed; we render overlays inside the hero with showOnMobile + mobileClassName */}

        {/* Controls removed for single-slide hero */}
      </div>
    </section>
  );
};

export default HomePromoRail;
