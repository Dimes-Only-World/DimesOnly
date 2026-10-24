import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface TierSlide {
  image: string;
  caption: string;
  emphasis?: boolean;
}

interface Props {
  slides: TierSlide[];
  title: string;
  audience: string;
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

const TierSlideCard: React.FC<Props> = ({ slides, title, audience, remaining }) => {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => setInView(!!e && e.intersectionRatio >= 0.95),
      { threshold: [0, 0.5, 0.95, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setI((n) => (n + 1) % slides.length), 4000);
    return () => clearInterval(id);
  }, [slides.length, inView]);
  const s = slides[i] ?? slides[0]!;

  return (
    <div ref={ref} className="relative flex h-[500px] w-full flex-col justify-end overflow-hidden border-y border-gray-800 bg-[#0b0b0b] shadow-lg lg:rounded-3xl lg:border">
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="sync">
          <motion.img
            key={i}
            src={s.image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-contain object-center"
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
        <div className="mt-3 flex min-h-[3.5rem] items-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={s.caption}
              className={
                s.emphasis
                  ? "text-xl font-bold leading-snug text-[#E916D1] md:text-2xl"
                  : "text-base font-semibold leading-snug text-white md:text-lg"
              }
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {s.caption}
            </motion.p>
          </AnimatePresence>
        </div>
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

    </div>
  );
};

export default TierSlideCard;
