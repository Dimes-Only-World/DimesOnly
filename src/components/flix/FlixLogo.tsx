import React from "react";
import wordmark from "@/assets/flix/flameflix-wordmark-home.jpg.asset.json";
import LiveFlame from "./LiveFlame";
import "./flix.css";

interface FlixLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const heights: Record<NonNullable<FlixLogoProps["size"]>, string> = {
  sm: "h-7 md:h-8",
  md: "h-10 md:h-12",
  lg: "h-20 md:h-28",
};

/**
 * FlameFlix wordmark. The word itself never moves — a single live flame burns
 * over the "I" in FLIX. The source art is on black, so mix-blend-screen drops
 * the background cleanly onto the dark FlameFlix surfaces.
 */
const FlixLogo: React.FC<FlixLogoProps> = ({ size = "md", className = "" }) => {
  return (
    <span className={`flix-logo relative inline-block select-none ${heights[size]} ${className}`}>
      <img
        src={wordmark.url}
        alt="FlameFlix"
        className={`flix-logo-base block w-auto ${heights[size]} object-contain mix-blend-screen`}
        draggable={false}
      />
      {/* Live fire on the "I" only (logo art is 559x160; the I sits at ~78% across) */}
      <LiveFlame left={76} width={13} bottom={0} height={118} />
    </span>
  );
};

export default FlixLogo;
