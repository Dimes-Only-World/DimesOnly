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
}

const TierSlideCard: React.FC<Props> = ({ slides, title, audience, tier1, tier2 }) => {
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
            className="absolute bottom-0 left-0 h-full w-auto max-w-none object-contain object-bottom"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.5 }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      </div>

      <div className="relative z-10 p-8 text-left">
        <p className="text-sm font-semibold uppercase tracking-widest text-gray-300">{audience}</p>
        <h3 className="mt-2 text-2xl font-bold text-[#E916D1] md:text-3xl">{title}</h3>
        <p className="mt-4 text-sm text-white"><span className="font-semibold">Tier 1:</span> {tier1}</p>
        <p className="text-sm text-white"><span className="font-semibold">Tier 2:</span> {tier2}</p>
        <p className="mt-2 text-sm font-semibold text-yellow-400">This won't last!</p>
      </div>

      <div className="absolute bottom-4 right-4 z-20 flex gap-1.5">
        {slides.map((_, n) => (
          <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-[#E916D1]" : "w-2 bg-white/40"}`} />
        ))}
      </div>
    </div>
  );
};

export default TierSlideCard;
