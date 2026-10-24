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
    <div className="flex w-full items-stretch gap-4 border-y border-gray-800 bg-[#0b0b0b] p-3 lg:rounded-3xl lg:border">
      <div className="relative h-[340px] w-1/2 shrink-0 overflow-hidden rounded-2xl bg-black">
        <AnimatePresence mode="sync">
          <motion.img
            key={i}
            src={s.image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain object-left"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.5 }}
          />
        </AnimatePresence>
        <div className="absolute bottom-3 right-3 z-20 flex gap-1.5">
          {slides.map((_, n) => (
            <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-[#E916D1]" : "w-2 bg-white/40"}`} />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 text-white">
        <h3 className="text-xl font-bold text-[#E916D1]">{title}</h3>
        <p className="text-sm text-white/70">{audience}</p>
        <p className="text-sm"><span className="font-semibold">Tier 1:</span> {tier1}</p>
        <p className="text-sm"><span className="font-semibold">Tier 2:</span> {tier2}</p>
        <p className="text-sm font-semibold text-yellow-400">This won't last!</p>
      </div>
    </div>
  );
};

export default TierSlideCard;
