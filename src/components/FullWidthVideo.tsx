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

  return (
    <div className={`relative w-screen bg-black ${className}`}>
      {srcMobile && (
        <video
          key="mobile"
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline={playsInline}
          preload="auto"
          poster={mobilePoster}
          className={`absolute inset-0 w-screen h-full object-cover md:object-contain mx-auto transition-opacity duration-200 ${
            isMobileView ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
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
          preload="auto"
          poster={desktopPoster}
          className={`absolute inset-0 w-screen h-full object-contain mx-auto transition-opacity duration-200 ${
            !isMobileView ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
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
          preload="auto"
          poster={desktopPoster}
          className="absolute inset-0 w-screen h-full object-contain mx-auto"
        >
          <source src={singleSource.url} type={singleSource.mime} />
        </video>
      )}

      <div className="relative pb-[177.78%] md:pb-[56.25%]" />
    </div>
  );
};

export default FullWidthVideo;