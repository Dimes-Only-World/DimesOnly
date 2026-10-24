import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface TierSlide {
  image: string;
}

interface Props {
  slides: TierSlide[];
}

const TierSlideCard: React.FC<Props> = ({ slides }) => {
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
          className="absolute inset-0"
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

      <div className="absolute bottom-6 right-4 z-20 flex gap-2">
        {slides.map((_, n) => (
          <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-[#E916D1]" : "w-2 bg-white/40"}`} />
        ))}
      </div>
    </div>
  );
};

export default TierSlideCard;
