import React, { useEffect, useMemo, useState } from "react";
import introWordmark from "@/assets/flix/flameflix-wordmark-flames.png.asset.json";
import LiveFlame from "./LiveFlame";
import "./flix.css";

interface FlixIntroProps {
  onDone: () => void;
}

const SESSION_KEY = "flix_intro_seen_for";

const currentViewerKey = () => {
  try {
    const raw = sessionStorage.getItem("userData");
    const id = raw ? JSON.parse(raw)?.id : null;
    return id ? String(id) : "guest";
  } catch {
    return "guest";
  }
};

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
    const doneTimer = setTimeout(finish, 4200);
    return () => {
      clearTimeout(skipTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    setFading(true);
    sessionStorage.setItem(SESSION_KEY, currentViewerKey());
    setTimeout(onDone, 600);
  };

  const embers = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: 58 + Math.random() * 34,
        size: 3 + Math.random() * 5,
        delay: 0.8 + Math.random() * 2.2,
        duration: 1.6 + Math.random() * 1.6,
        x: (Math.random() - 0.5) * 70,
      })),
    [],
  );

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#0B0B0D] flex items-center justify-center transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
      role="dialog"
      aria-label="FlameFlix intro"
    >
      <div className="relative w-[86vw] max-w-[860px]">
        <div className="flix-intro-logo relative">
          <img
            src={introWordmark.url}
            alt="FlameFlix"
            className="block w-full h-auto object-contain"
            draggable={false}
          />
          {/* Live fire on the F and the I only — the letters themselves stay still */}
          <LiveFlame left={54} width={20} bottom={10} height={90} />
          <LiveFlame left={74} width={15} bottom={12} height={80} />
        </div>
        {!reducedMotion &&
          embers.map((e) => (
            <span
              key={e.id}
              className="flix-ember-particle"
              style={
                {
                  left: `${e.left}%`,
                  bottom: "35%",
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
        style={{ animationDelay: "1.2s" }}
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

export const shouldShowFlixIntro = () =>
  sessionStorage.getItem(SESSION_KEY) !== currentViewerKey();

export default FlixIntro;
