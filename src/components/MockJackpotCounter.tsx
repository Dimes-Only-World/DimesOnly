import React, { useEffect, useState } from "react";
import JoinFreeButton from "@/components/JoinFreeButton";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

/** Example jackpot for curiosity only — clearly labelled; the real live jackpot is shown to members inside. */
const MockJackpotCounter: React.FC = () => {
  const [target, setTarget] = useState(34674.78);
  const [shown, setShown] = useState(34674.78);
  const [glow, setGlow] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setTarget((t) => t + Math.round((Math.random() * 25 + 1) * 100) / 100);
      setGlow(true);
      setTimeout(() => setGlow(false), 600);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setShown((s) => {
        const d = target - s;
        if (Math.abs(d) < 0.01) return target;
        raf = requestAnimationFrame(tick);
        return s + d * 0.12;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <section className="bg-black py-16 px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-400">Example Jackpot</p>
      <div
        className={`mt-3 text-5xl sm:text-6xl md:text-7xl font-black tabular-nums text-white transition-[text-shadow] duration-500 ${
          glow ? "[text-shadow:0_0_28px_rgba(249,115,22,0.9)]" : "[text-shadow:0_0_8px_rgba(249,115,22,0.3)]"
        }`}
      >
        {fmt(shown)}
      </div>
      <p className="mt-4 text-sm text-white/70 max-w-md mx-auto">
        This is an example for illustration only. The real, live jackpot is disclosed inside to members.
      </p>
      <div className="mt-8"><JoinFreeButton /></div>
    </section>
  );
};

export default MockJackpotCounter;
