import { useState } from "react";
import placeholderLady from "../../../../assets/weo.png";

const HeroBanner = () => {
  const [videoError, setVideoError] = useState(false);

  const VERSION = "v2";
  const desktopSrc = `https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+16-9+1080+CINEMA.webm?v=${VERSION}`;
  const mobileSrc = `https://dimesonlyworld.s3.us-east-2.amazonaws.com/HOME+PAGE+9-16+1080+FINAL.webm?v=${VERSION}`;

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
        className="absolute inset-0 w-full h-full object-cover object-center" />


      {/* Desktop Video */}
      {!videoError &&
      <video
        className="hidden md:block absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setVideoError(true)}>

          <source src={desktopSrc} type="video/webm" />
        </video>
      }

      {/* Mobile Video */}
      {!videoError &&
      <video
        className="block md:hidden absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setVideoError(true)}>

          <source src={mobileSrc} type="video/webm" />
        </video>
      }

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Translucent gradient for CTA visibility over media */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <button
          onClick={scrollDown}
          className="mt-4 px-8 py-4 rounded-full bg-[#E916D1] text-black font-bold text-lg transition-all hover:bg-[#E916D1]/90 hover:scale-105"
          style={{ boxShadow: '0 0 20px rgba(233, 22, 209, 0.5)' }}>
          Get Started Below ↓
        </button>
      </div>
    </section>);

};

export default HeroBanner;