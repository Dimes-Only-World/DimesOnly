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
      {/* Live flame layer: only the flame above the I, drifting continuously */}
      <img
        src={wordmark.url}
        alt=""
        aria-hidden
        className={`flix-logo-burn pointer-events-none absolute inset-0 w-auto ${heights[size]} object-contain mix-blend-screen`}
        draggable={false}
      />
      {/* Embers drifting off the flame tip */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          className="flix-logo-spark pointer-events-none"
          style={{
            left: `${70 + i * 3}%`,
            animationDelay: `${i * 0.7}s`,
            ["--spark-x" as string]: `${i % 2 === 0 ? 3 : -3}px`,
          }}
        />
      ))}
    </span>
  );
};

export default FlixLogo;
