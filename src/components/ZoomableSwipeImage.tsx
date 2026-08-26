import React, { useEffect, useRef, useState } from "react";

interface ZoomableSwipeImageProps {
  src: string;
  alt?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

/**
 * Touch-friendly image viewer: pinch to zoom, drag to pan while zoomed,
 * swipe left/right to change photos when not zoomed.
 */
const ZoomableSwipeImage: React.FC<ZoomableSwipeImageProps> = ({
  src,
  alt = "",
  onSwipeLeft,
  onSwipeRight,
}) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null
  );
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);

  // Reset zoom whenever the photo changes
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [src]);

  const distance = () => {
    const pts = Array.from(pointers.current.values());
    if (pts.length < 2) return 0;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.hypot(dx, dy);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      pinchStart.current = { dist: distance(), scale };
      swipeStart.current = null;
      panStart.current = null;
    } else if (pointers.current.size === 1) {
      swipeStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        ox: offset.x,
        oy: offset.y,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchStart.current) {
      const d = distance();
      if (pinchStart.current.dist > 0) {
        const next = clamp(
          (pinchStart.current.scale * d) / pinchStart.current.dist,
          MIN_SCALE,
          MAX_SCALE
        );
        setScale(next);
        if (next === 1) setOffset({ x: 0, y: 0 });
      }
      return;
    }

    if (scale > 1 && panStart.current) {
      setOffset({
        x: panStart.current.ox + (e.clientX - panStart.current.x),
        y: panStart.current.oy + (e.clientY - panStart.current.y),
      });
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    const start = swipeStart.current;
    const wasPinching = pointers.current.size >= 2;
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2) pinchStart.current = null;

    if (!wasPinching && scale === 1 && start) {
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) onSwipeLeft?.();
        else onSwipeRight?.();
      }
    }

    if (pointers.current.size === 0) {
      swipeStart.current = null;
      panStart.current = null;
    }
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  return (
    <div
      className="w-full h-full flex items-center justify-center overflow-hidden select-none"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onDoubleClick={handleDoubleClick}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="max-w-[98vw] max-h-[88vh] object-contain"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transition: pinchStart.current ? "none" : "transform 0.12s ease-out",
        }}
      />
    </div>
  );
};

export default ZoomableSwipeImage;
