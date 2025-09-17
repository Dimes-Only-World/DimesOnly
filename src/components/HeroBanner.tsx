import React from 'react';

// Video-only hero: legacy slides removed.

const HeroBanner: React.FC = () => {
  const phoneSrc = 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/9-16+HOME.mp4';
  const desktopSrc = 'https://dimesonlyworld.s3.us-east-2.amazonaws.com/16-9+HOME.mp4';
  return (
    <section className="relative w-full h-screen overflow-hidden bg-black">
      <style>
        {`
        /* Prefer desktop video on iPads (portrait and landscape) */
        @media only screen and (min-width: 744px) and (max-width: 1366px) {
          .hero-desktop-vid { display: block !important; }
          .hero-phone-vid { display: none !important; }
        }
        `}
      </style>
      {/* Desktop video (lg and up; iPads forced via media queries) */}
      <video
        className="hidden lg:block hero-desktop-vid absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src={desktopSrc} type="video/mp4" />
      </video>
      {/* Phone video (below lg by default) - use object-contain to avoid edge cropping */}
      <video
        className="block lg:hidden hero-phone-vid absolute inset-0 w-full h-full object-contain object-center bg-black"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src={phoneSrc} type="video/mp4" />
      </video>
    </section>
  );
};

export default HeroBanner;
