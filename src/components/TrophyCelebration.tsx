import { useEffect, useMemo, useRef, useState } from "react";
import trophyImg from "@/assets/trophy-gold.png";

const COLORS = [
  "#FFD700",
  "#E916D1",
  "#22D3EE",
  "#FB923C",
  "#A3E635",
  "#F87171",
  "#FFFFFF",
];

type Piece = {
  id: number;
  left: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotate: number;
};

const TrophyCelebration = ({ className = "" }: { className?: string }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          setBurst((b) => b + 1);
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: 50 + (Math.random() * 30 - 15),
        x: Math.random() * 260 - 130,
        delay: Math.random() * 0.5,
        duration: 1.6 + Math.random() * 1.4,
        color: COLORS[i % COLORS.length],
        size: 5 + Math.random() * 6,
        rotate: Math.random() * 720 - 360,
      })),
    [burst]
  );

  return (
    <div
      ref={ref}
      className={`relative flex justify-center pointer-events-none ${className}`}
    >
      <style>{`
        @keyframes trophy-pop {
          0% { transform: scale(0.4) rotate(-25deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(8deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes trophy-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes confetti-fall {
          0% { transform: translate(0, -10px) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--cx), 150px) rotate(var(--cr)); opacity: 0; }
        }
      `}</style>

      {inView &&
        pieces.map((p) => (
          <span
            key={`${burst}-${p.id}`}
            className="absolute top-0 rounded-[2px]"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.6,
              backgroundColor: p.color,
              // @ts-expect-error custom props
              "--cx": `${p.x}px`,
              "--cr": `${p.rotate}deg`,
              animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            }}
          />
        ))}

      <img
        src={trophyImg}
        alt="Trophy"
        width={512}
        height={640}
        loading="lazy"
        className="relative w-16 h-20 md:w-20 md:h-24 object-contain drop-shadow-[0_6px_14px_rgba(255,215,0,0.45)]"
        style={{
          animation: inView
            ? "trophy-pop 0.9s cubic-bezier(0.22,1,0.36,1), trophy-float 3s ease-in-out 0.9s infinite"
            : undefined,
          opacity: inView ? 1 : 0,
        }}
      />
    </div>
  );
};

export default TrophyCelebration;
