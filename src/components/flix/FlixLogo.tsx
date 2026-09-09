import React from "react";
import { Flame } from "lucide-react";

interface FlixLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { text: "text-lg", flame: 14 },
  md: { text: "text-2xl", flame: 20 },
  lg: { text: "text-5xl md:text-7xl", flame: 44 },
};

/** FlameFlix wordmark — the dot on the i is a living flame. */
const FlixLogo: React.FC<FlixLogoProps> = ({ size = "md", className = "" }) => {
  const s = sizes[size];
  return (
    <span className={`inline-flex items-baseline font-black tracking-tight text-white select-none ${s.text} ${className}`}>
      <span>FLAME</span>
      <span>FL</span>
      <span className="relative inline-flex flex-col items-center justify-end self-stretch">
        <Flame
          size={s.flame}
          className="flix-flame-flicker text-[#FF4D1A] fill-[#FFB020] drop-shadow-[0_0_8px_rgba(255,77,26,0.8)] -mb-[0.05em]"
          aria-hidden
        />
        <span className="leading-none">I</span>
      </span>
      <span>X</span>
    </span>
  );
};

export default FlixLogo;
