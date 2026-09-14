import React from "react";
import wordmark from "@/assets/flix/flameflix-wordmark-home.jpg.asset.json";
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
 * FlameFlix wordmark — the burning "I" in FLIX flickers with a live flame.
 * The source art is on black, so mix-blend-screen drops the background
 * cleanly onto the dark FlameFlix surfaces.
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
      {/* Live flame layer: same art, burning hotter, pulsing over the base */}
      <img
        src={wordmark.url}
        alt=""
        aria-hidden
        className={`flix-logo-burn pointer-events-none absolute inset-0 w-auto ${heights[size]} object-contain mix-blend-screen`}
        draggable={false}
      />
      {/* Ember glow anchored over the burning I in FLIX */}
      <span className="flix-logo-emberglow pointer-events-none" aria-hidden />
    </span>
  );
};

export default FlixLogo;
