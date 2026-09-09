import React, { useEffect, useMemo, useState } from "react";
import { Flame } from "lucide-react";
import "./flix.css";

interface FlixIntroProps {
  onDone: () => void;
}

const WORD = "FLAMEFLIX";
const SESSION_KEY = "flix_intro_seen";

/** Full-screen animated intro — plays once per session. */
const FlixIntro: React.FC<FlixIntroProps> = ({ onDone }) => {
  const [canSkip, setCanSkip] = useState(false);
  const [fading, setFading] = useState(false);
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    if (reducedMotion) {
      const t = setTimeout(finish, 1200);
      return () => clearTimeout(t);
    }
    const skipTimer = setTimeout(() => setCanSkip(true), 1500);
    const doneTimer = setTimeout(finish, WORD.length * 120 + 2600);
    return () => {
      clearTimeout(skipTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    setFading(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    setTimeout(onDone, 600);
  };

  const embers = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: 44 + Math.random() * 12,
        size: 3 + Math.random() * 5,
        delay: 1.2 + Math.random() * 1.8,
        duration: 1.6 + Math.random() * 1.6,
        x: (Math.random() - 0.5) * 60,
      })),
    [],
  );

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#0B0B0D] flex items-center justify-center transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
      role="dialog"
      aria-label="FlameFlix intro"
    >
      <div className="relative font-black tracking-tight text-white text-6xl md:text-8xl select-none">
        {WORD.split("").map((ch, i) => {
          // The "I" (index 7 in FLAMEFLIX) gets the flaming tittle
          const isFlamingI = i === 7;
          return (
            <span key={i} className="flix-intro-letter relative" style={{ animationDelay: `${i * 0.12}s` }}>
              {isFlamingI ? (
                <span className="relative inline-flex flex-col items-center justify-end">
                  <span className="relative block h-[0.35em] w-[0.35em]">
                    <Flame className="flix-intro-flame absolute inset-0 h-full w-full text-[#FF4D1A] fill-[#FFB020]" aria-hidden />
                  </span>
                  <span className="leading-none">{ch}</span>
                </span>
              ) : (
                ch
              )}
            </span>
          );
        })}
        {!reducedMotion &&
          embers.map((e) => (
            <span
              key={e.id}
              className="flix-ember-particle"
              style={
                {
                  left: `${e.left}%`,
                  bottom: "30%",
                  width: e.size,
                  height: e.size,
                  animationDelay: `${e.delay}s`,
                  animationDuration: `${e.duration}s`,
                  "--ember-x": `${e.x}px`,
                } as React.CSSProperties
              }
            />
          ))}
      </div>
      <p
        className="absolute bottom-1/4 text-[#A1A1A1] text-sm md:text-base tracking-wide flix-intro-letter"
        style={{ animationDelay: `${WORD.length * 0.12 + 0.3}s` }}
      >
        Heat up the night. Stream what hits.
      </p>
      {canSkip && (
        <button
          onClick={finish}
          className="absolute bottom-8 right-8 px-5 py-2 rounded-full border border-[#2A2A2A] text-[#A1A1A1] hover:text-white hover:border-[#FF4D1A] transition-colors text-sm"
        >
          Skip
        </button>
      )}
    </div>
  );
};

export const shouldShowFlixIntro = () => !sessionStorage.getItem(SESSION_KEY);

export default FlixIntro;
