import React, { useEffect, useMemo, useState } from "react";
import BannerVideo from "@/components/BannerVideo";

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

const FullWidthVideo: React.FC<FullWidthVideoProps> = ({
  srcDesktop,
  srcMobile,
  src,
  className = "",
  loop = true,
}) => {
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mqMobile = window.matchMedia("(max-width: 768px)");
    const mqPortrait = window.matchMedia("(orientation: portrait)");
    const update = () => setIsMobileView(mqMobile.matches || mqPortrait.matches);
    update();
    const add = (mq: MediaQueryList, fn: () => void) => {
      if (mq.addEventListener) mq.addEventListener("change", fn);
      else mq.addListener(fn);
    };
    const remove = (mq: MediaQueryList, fn: () => void) => {
      if (mq.removeEventListener) mq.removeEventListener("change", fn);
      else mq.removeListener(fn);
    };
    add(mqMobile, update);
    add(mqPortrait, update);
    return () => {
      remove(mqMobile, update);
      remove(mqPortrait, update);
    };
  }, []);

  const videoSrc = useMemo(() => {
    if (src && !srcDesktop && !srcMobile) return src;
    return isMobileView ? (srcMobile || srcDesktop || "") : (srcDesktop || srcMobile || "");
  }, [src, srcDesktop, srcMobile, isMobileView]);

  if (!videoSrc) return null;

  return (
    <div className={className}>
      <BannerVideo src={videoSrc} loop={loop} />
    </div>
  );
};

export default FullWidthVideo;
