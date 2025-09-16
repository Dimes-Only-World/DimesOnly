import React from "react";

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
  const phoneSrc = "https://dimesonlyworld.s3.us-east-2.amazonaws.com/9-16+HOME.mp4";
  const desktopSrc = "https://dimesonlyworld.s3.us-east-2.amazonaws.com/16-9+HOME.mp4";
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-700 ${
        isActive ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Desktop video */}
      <video
        className="hidden md:block w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={desktopSrc} type="video/mp4" />
      </video>
      {/* Mobile video */}
      <video
        className="block md:hidden w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={phoneSrc} type="video/mp4" />
      </video>
    </div>
  );
};

export default HeroSlide;
