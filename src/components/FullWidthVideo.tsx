import React, { useEffect, useMemo, useState } from "react";

interface FullWidthVideoProps {
  srcDesktop?: string;
  srcMobile?: string;
  src?: string;
  posterDesktop?: string;
  posterMobile?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
}

function mimeFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const lower = url.toLowerCase();
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".ogg") || lower.endsWith(".ogv")) return "video/ogg";
  return undefined;
}

const FullWidthVideo: React.FC<FullWidthVideoProps> = ({
  srcDesktop,
  srcMobile,
  src,
  posterDesktop,
  posterMobile,
  className = "",
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
}) => {
  const [isMobileView, setIsMobileView] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mqMobile = window.matchMedia("(max-width: 768px)");
    const mqPortrait = window.matchMedia("(orientation: portrait)");

    const update = () => {
      setIsMobileView(mqMobile.matches || mqPortrait.matches);
    };

    update();

    const add = (mq: MediaQueryList, listener: () => void) => {
      if (mq.addEventListener) mq.addEventListener("change", listener);
      else mq.addListener(listener);
    };
    const remove = (mq: MediaQueryList, listener: () => void) => {
      if (mq.removeEventListener) mq.removeEventListener("change", listener);
      else mq.removeListener(listener);
    };

    add(mqMobile, update);
    add(mqPortrait, update);

    return () => {
      remove(mqMobile, update);
      remove(mqPortrait, update);
    };
  }, []);

  const singleSource = useMemo(() => {
    if (src && !srcDesktop && !srcMobile) {
      return { url: src, mime: mimeFromUrl(src) };
    }
    return null;
  }, [src, srcDesktop, srcMobile]);

  const desktopPoster = posterDesktop || posterMobile || undefined;
  const mobilePoster = posterMobile || posterDesktop || undefined;

  const handleVideoError = () => {
    setVideoError(true);
  };

  // If video fails, show nothing (skip this section gracefully)
  if (videoError) {
    return null;
  }

  return (
    <div className={`relative w-full overflow-hidden bg-black ${className}`}>
      {srcMobile && (
        <video
          key="mobile"
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline={playsInline}
          preload="metadata"
          poster={mobilePoster}
          onError={handleVideoError}
          className={`w-full h-auto max-w-full transition-opacity duration-200 ${
            isMobileView
              ? "block opacity-100"
              : "hidden opacity-0"
          }`}
        >
          <source src={srcMobile} type={mimeFromUrl(srcMobile)} />
        </video>
      )}

      {srcDesktop && (
        <video
          key="desktop"
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline={playsInline}
          preload="metadata"
          poster={desktopPoster}
          onError={handleVideoError}
          className={`w-full h-auto max-w-full transition-opacity duration-200 ${
            !isMobileView
              ? "block opacity-100"
              : "hidden opacity-0"
          }`}
        >
          <source src={srcDesktop} type={mimeFromUrl(srcDesktop)} />
        </video>
      )}

      {singleSource && (
        <video
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline={playsInline}
          preload="metadata"
          poster={desktopPoster}
          onError={handleVideoError}
          className="w-full h-auto max-w-full"
        >
          <source src={singleSource.url} type={singleSource.mime} />
        </video>
      )}
    </div>
  );
};
export default FullWidthVideo;