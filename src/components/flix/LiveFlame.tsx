import React from "react";
import flame from "@/assets/flix/flame-tongue.png.asset.json";
import "./flix.css";

interface LiveFlameProps {
  /** Position/size of the flame inside its relatively-positioned parent, in % */
  left: number;
  width: number;
  /** Distance of the flame base from the parent's top, in % */
  bottom: number;
  height: number;
  className?: string;
}

/**
 * A live, continuously moving flame made of three offset copies of the same
 * flame cut-out. Each layer drifts/leans/stretches on its own timing so the
 * fire wavers instead of pulsing in sync. Only this element animates — the
 * wordmark underneath stays perfectly still.
 */
const LiveFlame: React.FC<LiveFlameProps> = ({ left, width, bottom, height, className = "" }) => (
  <span
    className={`flix-flame pointer-events-none ${className}`}
    aria-hidden
    style={{ left: `${left}%`, width: `${width}%`, bottom: `${bottom}%`, height: `${height}%` }}
  >
    <img src={flame.url} alt="" className="flix-flame-layer flix-flame-a" draggable={false} />
    <img src={flame.url} alt="" className="flix-flame-layer flix-flame-b" draggable={false} />
    <img src={flame.url} alt="" className="flix-flame-layer flix-flame-c" draggable={false} />
    <span className="flix-flame-spark flix-flame-spark-1" />
    <span className="flix-flame-spark flix-flame-spark-2" />
    <span className="flix-flame-spark flix-flame-spark-3" />
  </span>
);

export default LiveFlame;
