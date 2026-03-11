import { useState, useEffect } from "react";
import placeholderLady from "../../../../assets/weo.png";

const HeroBanner = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const VERSION = "v2";
  const desktopSrc = `https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+16-9+1080+CINEMA.webm?v=${VERSION}`;
  const mobileSrc = `https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+9-16+1080+FINAL.webm?v=${VERSION}`;
  const videoSrc = isMobile ? mobileSrc : desktopSrc;

  const scrollDown = () => {
    const next = document.getElementById("referrer-section");
    next?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      {/* Fallback image */}
      <img
        src={placeholderLady}
        alt="Hero background"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />

      {/* Hero Video — uses same BannerVideo logic inline since this is a separate landing project */}
      <video
        key={videoSrc}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        loop
        preload="metadata"
      >
        <source src={videoSrc} type="video/webm" />
      </video>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Translucent gradient for CTA visibility over media */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 text-center px-4">
      </div>
    </section>
  );
};

export default HeroBanner;
