import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface TierSlide {
  image: string;
  eyebrow: string;
  headline: string;
  amount: string;
  note: string;
}

interface Props {
  audience: string;
  title: string;
  slides: TierSlide[];
  remaining: React.ReactNode;
}

const TierSlideCard: React.FC<Props> = ({ audience, title, slides, remaining }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % slides.length), 4000);
    return () => clearInterval(id);
  }, [slides.length]);
  const s = slides[i] ?? slides[0]!;

  return (
    <div className="relative h-[520px] w-full overflow-hidden border-y border-gray-800 bg-[#0b0b0b] lg:rounded-3xl lg:border">
      <AnimatePresence mode="sync">
        <motion.div
          key={i}
          className="absolute inset-0 flex items-end justify-center"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.5 }}
        >
          <motion.img
            src={s.image}
            alt=""
            loading="lazy"
            className="h-full w-full shrink-0 object-cover object-center"
            initial={{ scale: 1 }}
            animate={{ scale: 1.12 }}
            transition={{ duration: 4.2, ease: "easeOut" }}
          />
        </motion.div>
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/85 via-black/55 to-transparent" />

      <div className="relative z-10 flex h-full flex-col justify-between p-6 pb-20 md:p-8 md:pb-20">
        <div className="w-fit rounded-xl border border-[#E916D1]/40 bg-black/85 px-4 py-3 backdrop-blur-md">
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-300">{audience}</p>
          <h3 className="mt-1 text-2xl font-bold text-[#E916D1] md:text-3xl">{title}</h3>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            className="rounded-2xl border border-[#E916D1]/50 bg-black/70 p-4 backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#E916D1]">{s.eyebrow}</p>
            <p className="mt-1 text-lg font-bold text-white">{s.headline}</p>
            <p className="text-3xl font-black text-white tabular-nums md:text-4xl">{s.amount}</p>
            <p className="mt-1 text-sm text-gray-300">{s.note}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-4 left-4 z-20 flex items-baseline gap-2 rounded-xl border border-[#E916D1]/50 bg-black/80 px-3 py-2 backdrop-blur">
        <span className="text-xs uppercase tracking-wide text-gray-300">Positions Left:</span>
        <span className="text-2xl font-extrabold text-[#E916D1]">{remaining}</span>
      </div>

      <div className="absolute bottom-6 right-4 z-20 flex gap-2">
        {slides.map((_, n) => (
          <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-[#E916D1]" : "w-2 bg-white/40"}`} />
        ))}
      </div>
    </div>
  );
};

export default TierSlideCard;
