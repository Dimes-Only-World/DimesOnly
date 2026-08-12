import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

export interface BackgroundMedia {
  id: string;
  media_type: "image" | "video";
  url: string;
}

interface Props {
  /** Milliseconds each image stays on screen. Videos advance when they end. */
  interval?: number;
  /** Provide media directly (used by the admin preview). Otherwise fetched from the database. */
  media?: BackgroundMedia[];
  /** Force a device set instead of detecting it. */
  device?: "desktop" | "mobile";
  /** "fixed" pins the background to the viewport; "absolute" keeps it inside its container. */
  position?: "fixed" | "absolute";
  className?: string;
}

const FADE_MS = 700;

const ShortFormBackgroundCarousel: React.FC<Props> = ({
  interval = 6000,
  media,
  device,
  position = "absolute",
  className = "",
}) => {
  const isMobile = useIsMobile();
  const resolvedDevice = device ?? (isMobile ? "mobile" : "desktop");

  const [items, setItems] = useState<BackgroundMedia[]>(media ?? []);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);

  // Load the media list for the active device size.
  useEffect(() => {
    if (media) {
      setItems(media);
      setIndex(0);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("short_form_backgrounds")
        .select("id, media_type, url")
        .eq("device", resolvedDevice)
        .order("sort_order", { ascending: true });

      if (cancelled || error || !data) return;
      setItems(data as BackgroundMedia[]);
      setIndex(0);
    })();
    return () => {
      cancelled = true;
    };
  }, [media, resolvedDevice]);

  const current = items[index];

  const advance = () => {
    if (items.length < 2) return;
    // Fade to black, then swap to the next item and fade it back in.
    setVisible(false);
    window.setTimeout(() => setIndex((i) => (i + 1) % items.length), FADE_MS);
  };

  // Fade the current item in and schedule the next transition for images.
  useEffect(() => {
    if (!current) return;
    const show = window.setTimeout(() => setVisible(true), 30);

    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (current.media_type === "image") {
      timerRef.current = window.setTimeout(advance, interval);
    }

    return () => {
      window.clearTimeout(show);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items, interval]);

  // iOS Safari: force the muted state and start playback imperatively, otherwise
  // the browser blocks autoplay and paints its native play control on top.
  useEffect(() => {
    if (!current || current.media_type !== "video") return;
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;

    let cancelled = false;

    const tryPlay = () =>
      video.play().catch(() => {
        // Autoplay blocked (Low Power Mode / policy) — skip to the next item
        // so a frozen frame with a play button is never left on screen.
        if (!cancelled) advance();
      });

    tryPlay();

    // iOS grants autoplay after the first user gesture — retry once when it happens.
    const retry = () => {
      if (cancelled) return;
      video.muted = true;
      video.play().catch(() => {});
    };
    window.addEventListener("touchstart", retry, { once: true, passive: true });
    window.addEventListener("scroll", retry, { once: true, passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener("touchstart", retry);
      window.removeEventListener("scroll", retry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, current?.media_type]);

  if (!current) return null;

  const videoMimeType = (url: string): string | undefined => {
    const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
    if (ext === "mp4" || ext === "m4v") return "video/mp4";
    if (ext === "webm") return "video/webm";
    if (ext === "mov") return "video/quicktime";
    if (ext === "ogv") return "video/ogg";
    return undefined;
  };

  return (
    <div
      className={`${position === "fixed" ? "fixed" : "absolute"} inset-0 overflow-hidden bg-black ${className}`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 transition-opacity ease-in-out"
        style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
      >
        {current.media_type === "video" ? (
          <video
            ref={videoRef}
            key={current.id}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop={items.length < 2}
            playsInline
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            // @ts-expect-error legacy iOS/Android inline playback attributes
            webkit-playsinline="true"
            x5-playsinline="true"
            preload="metadata"
            onEnded={advance}
            onError={advance}
          >
            <source src={current.url} type={videoMimeType(current.url)} />
          </video>
        ) : (
          <img
            key={current.id}
            src={current.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={advance}
          />
        )}
      </div>

      <div className="absolute inset-0 bg-black/50" />
    </div>
  );
};

export default ShortFormBackgroundCarousel;
