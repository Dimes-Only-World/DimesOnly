import React from "react";
import { usePageVideo } from "@/hooks/usePageVideo";

interface HeroSlideProps {
  title?: string;
  description?: string;
  desktopImage?: string;
  mobileImage?: string;
  isActive: boolean;
}

// Video-only hero slide. Uses a phone-optimized source for small screens
// and a desktop 16:9 source for md+ screens. Maintains the fade behavior
// via the isActive prop to stay compatible with HeroBanner.
const HeroSlide: React.FC<HeroSlideProps> = ({ isActive }) => {
    const { videoUrl: phoneSrc } = usePageVideo("home_hero_mobile");
    const { videoUrl: desktopSrc } = usePageVideo("home_hero_desktop");
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-700 ${
        isActive ? "opacity-100" : "opacity-0"
      }`}
    >
      <style>
        {`
        /* Prefer desktop video on iPads (portrait and landscape) */
        @media only screen and (min-width: 744px) and (max-width: 1366px) {
          .hero-desktop-vid { display: block !important; }
          .hero-phone-vid { display: none !important; }
        }
        `}
      </style>
      {/* Desktop video (lg and up by default; iPad forced via media queries) */}
      <video
        className="hidden lg:block hero-desktop-vid absolute inset-0 w-full h-full object-cover object-center"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        
      >
        <source src={desktopSrc} type="video/mp4" />
      </video>
      {/* Phone video (below lg by default) - fill screen to avoid black bars */}
      <video
        className="block lg:hidden hero-phone-vid absolute inset-0 w-full h-full object-cover object-center"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        
      >
        <source src={phoneSrc} type="video/mp4" />
      </video>
    </div>
  );
};

export default HeroSlide;
