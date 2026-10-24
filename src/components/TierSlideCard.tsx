import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface TierSlide {
  image: string;
}

interface Props {
  slides: TierSlide[];
  title: string;
  audience: string;
  tier1: string;
  tier2: string;
  remaining: number | string;
}

const WordFade: React.FC<{ text: string }> = ({ text }) => (
  <span className="inline-block">
    {text.split(" ").map((w, i) => (
      <motion.span
        key={i}
        className="mr-1 inline-block"
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05, duration: 0.45, ease: "easeOut" }}
        viewport={{ once: true }}
      >
        {w}
      </motion.span>
    ))}
  </span>
);

const TierSlideCard: React.FC<Props> = ({ slides, title, audience, tier1, tier2, remaining }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % slides.length), 4000);
    return () => clearInterval(id);
  }, [slides.length]);
  const s = slides[i] ?? slides[0]!;

  return (
    <div className="relative flex h-[500px] w-full flex-col justify-end overflow-hidden border-y border-gray-800 bg-[#0b0b0b] shadow-lg lg:rounded-3xl lg:border">
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="sync">
          <motion.img
            key={i}
            src={s.image}
            alt=""
            loading="lazy"
            className="absolute bottom-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 object-contain object-bottom lg:left-0 lg:translate-x-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
      </div>

      <div className="relative z-10 p-8 text-left">
        <p className="text-sm font-semibold uppercase tracking-widest text-gray-300">
          <WordFade text={audience} />
        </p>
        <h3 className="mt-2 text-2xl font-bold text-[#E916D1] md:text-3xl">
          <WordFade text={`${title} Memberships`} />
        </h3>
        <p className="mt-3 text-sm text-white">Tier 1: {tier1} · Tier 2: {tier2}</p>
        <div className="mt-6 flex items-baseline gap-3">
          <span className="text-sm uppercase tracking-wide text-gray-400">
            <WordFade text="Lifetime Positions Left:" />
          </span>
          <motion.span
            key={String(remaining)}
            className="text-5xl font-extrabold text-[#E916D1]"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {remaining}
          </motion.span>
        </div>
      </div>

      <div className="absolute right-4 top-4 z-20 flex gap-1.5">
        {slides.map((_, n) => (
          <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-[#E916D1]" : "w-2 bg-white/40"}`} />
        ))}
      </div>
    </div>
  );
};

export default TierSlideCard;
